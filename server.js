// VOXEL slicing service
// Accepts an uploaded .3mf, converts its mesh to STL, slices it with
// CuraEngine using an X1C-approximate profile, and returns filament
// weight (g) + print time (h/m) as JSON.
//
// This is a SEPARATE service from the main voxel-website - deploy it as
// its own Render Web Service (Docker environment), not inside the
// existing Node site.

const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 100 * 1024 * 1024 } });

const PROFILE = JSON.parse(fs.readFileSync(path.join(__dirname, 'profiles/x1c_pla_approx.json'), 'utf8'));
const CURA_ENGINE_BIN = process.env.CURA_ENGINE_BIN || '/opt/CuraEngine/build/CuraEngine';
const CURA_DEFS_DIR = process.env.CURA_DEFS_DIR || '/opt/cura-definitions';

function runPython(scriptArgs) {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', scriptArgs);
    let stdout = '', stderr = '';
    proc.stdout.on('data', d => stdout += d);
    proc.stderr.on('data', d => stderr += d);
    proc.on('close', code => {
      if (code !== 0) return reject(new Error('mesh_to_stl.py failed: ' + stderr));
      resolve(stdout);
    });
  });
}

function runCuraEngine(stlPath, gcodePath) {
  return new Promise((resolve, reject) => {
    const settingArgs = [];
    for (const [key, value] of Object.entries(PROFILE)) {
      if (key.startsWith('_')) continue;
      settingArgs.push('-s', `${key}=${value}`);
    }
    const args = [
      'slice',
      '-j', path.join(CURA_DEFS_DIR, 'fdmprinter.def.json'),
      '-e0',
      '-j', path.join(CURA_DEFS_DIR, 'fdmextruder.def.json'),
      ...settingArgs,
      '-l', stlPath,
      '-o', gcodePath
    ];
    const proc = spawn(CURA_ENGINE_BIN, args);
    let stderr = '';
    proc.stderr.on('data', d => stderr += d);
    proc.on('close', code => {
      if (code !== 0) return reject(new Error('CuraEngine failed: ' + stderr));
      resolve();
    });
    proc.on('error', reject);
  });
}

function parseGcodeStats(gcodePath) {
  // CuraEngine writes ;TIME:<seconds> and ;Filament used: <meters>m
  // in the gcode header comments - read just the first chunk, no need
  // to load the whole (potentially large) file.
  const fd = fs.openSync(gcodePath, 'r');
  const buf = Buffer.alloc(8192);
  fs.readSync(fd, buf, 0, 8192, 0);
  fs.closeSync(fd);
  const head = buf.toString('utf8');

  const timeMatch = /;TIME:(\d+)/.exec(head);
  const filamentMatch = /;Filament used:\s*([\d.]+)m/.exec(head);

  const seconds = timeMatch ? parseInt(timeMatch[1], 10) : null;
  const meters = filamentMatch ? parseFloat(filamentMatch[1]) : null;

  let grams = null;
  if (meters !== null) {
    const diameterMm = parseFloat(PROFILE.material_diameter || '1.75');
    const densityGCm3 = parseFloat(PROFILE.material_density_g_cm3 || '1.24');
    const radiusCm = (diameterMm / 10) / 2;
    const lengthCm = meters * 100;
    const volumeCm3 = Math.PI * radiusCm * radiusCm * lengthCm;
    grams = volumeCm3 * densityGCm3;
  }

  return {
    grams: grams !== null ? Math.round(grams * 10) / 10 : null,
    printHours: seconds !== null ? Math.floor(seconds / 3600) : null,
    printMinutes: seconds !== null ? Math.round((seconds % 3600) / 60) : null,
  };
}

app.post('/slice', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slice-'));
  const stlPath = path.join(workDir, 'model.stl');
  const gcodePath = path.join(workDir, 'output.gcode');

  try {
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext === '.stl') {
      fs.copyFileSync(req.file.path, stlPath);
    } else {
      // assume .3mf (or anything zip-based carrying a 3dmodel.model mesh)
      await runPython([path.join(__dirname, 'scripts/mesh_to_stl.py'), req.file.path, stlPath]);
    }

    await runCuraEngine(stlPath, gcodePath);
    const stats = parseGcodeStats(gcodePath);

    res.json({
      ok: true,
      grams: stats.grams,
      printHours: stats.printHours,
      printMinutes: stats.printMinutes,
      note: 'Estimate from an X1C-approximate profile, not an exact Bambu Studio match.'
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
    fs.rmSync(req.file.path, { force: true });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('VOXEL slicer service listening on ' + PORT));
