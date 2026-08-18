#!/usr/bin/env python3
"""
Converts the raw mesh geometry inside a .3mf (or accepts a passthrough .stl)
into a plain binary STL that CuraEngine can slice directly.

Why this exists: CuraEngine's CLI loader (-l flag) is built for STL, not the
full 3MF project format Bambu/Cura use (which also carries print settings,
plate info, etc. that CuraEngine doesn't need). Rather than depend on
CuraEngine's newer/flakier 3MF support, we extract just the triangle mesh
ourselves (proven working against a real MakerWorld file) and hand
CuraEngine a plain STL, which is the most universally reliable input format
for it.

Usage: python3 mesh_to_stl.py input.3mf output.stl
"""
import sys
import struct
import zipfile
import xml.etree.ElementTree as ET

NS = {'m': 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02'}


def extract_mesh_from_3mf(path):
    with zipfile.ZipFile(path) as z:
        model_path = None
        for name in z.namelist():
            if name.endswith('3dmodel.model'):
                model_path = name
                break
        if not model_path:
            raise ValueError("No 3D/3dmodel.model found inside this .3mf")
        with z.open(model_path) as f:
            tree = ET.parse(f)

    root = tree.getroot()
    all_verts = []
    all_tris = []
    offset = 0
    for mesh in root.findall('.//m:mesh', NS):
        verts_el = mesh.find('m:vertices', NS)
        tris_el = mesh.find('m:triangles', NS)
        local_verts = [
            (float(v.get('x')), float(v.get('y')), float(v.get('z')))
            for v in verts_el.findall('m:vertex', NS)
        ]
        for t in tris_el.findall('m:triangle', NS):
            i1 = int(t.get('v1')) + offset
            i2 = int(t.get('v2')) + offset
            i3 = int(t.get('v3')) + offset
            all_tris.append((i1, i2, i3))
        all_verts.extend(local_verts)
        offset += len(local_verts)

    if not all_tris:
        raise ValueError("Mesh had no triangles - unexpected file structure")
    return all_verts, all_tris


def compute_normal(p1, p2, p3):
    ux, uy, uz = p2[0]-p1[0], p2[1]-p1[1], p2[2]-p1[2]
    vx, vy, vz = p3[0]-p1[0], p3[1]-p1[1], p3[2]-p1[2]
    nx = uy*vz - uz*vy
    ny = uz*vx - ux*vz
    nz = ux*vy - uy*vx
    length = (nx**2 + ny**2 + nz**2) ** 0.5
    if length == 0:
        return (0.0, 0.0, 0.0)
    return (nx/length, ny/length, nz/length)


def write_binary_stl(verts, tris, out_path):
    with open(out_path, 'wb') as f:
        header = b'Converted from 3MF for CuraEngine slicing' + b'\x00' * 80
        f.write(header[:80])
        f.write(struct.pack('<I', len(tris)))
        for i1, i2, i3 in tris:
            p1, p2, p3 = verts[i1], verts[i2], verts[i3]
            nx, ny, nz = compute_normal(p1, p2, p3)
            f.write(struct.pack('<3f', nx, ny, nz))
            for p in (p1, p2, p3):
                f.write(struct.pack('<3f', *p))
            f.write(struct.pack('<H', 0))


def compute_volume_mm3(verts, tris):
    vol = 0.0
    for i1, i2, i3 in tris:
        p1, p2, p3 = verts[i1], verts[i2], verts[i3]
        vol += (1.0/6.0) * (
            -p3[0]*p2[1]*p1[2] + p2[0]*p3[1]*p1[2] + p3[0]*p1[1]*p2[2]
            - p1[0]*p3[1]*p2[2] - p2[0]*p1[1]*p3[2] + p1[0]*p2[1]*p3[2]
        )
    return abs(vol)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Usage: mesh_to_stl.py input.3mf output.stl", file=sys.stderr)
        sys.exit(1)
    in_path, out_path = sys.argv[1], sys.argv[2]
    verts, tris = extract_mesh_from_3mf(in_path)
    write_binary_stl(verts, tris, out_path)
    vol_mm3 = compute_volume_mm3(verts, tris)
    print(f"OK verts={len(verts)} tris={len(tris)} volume_mm3={vol_mm3:.2f}")
