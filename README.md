# VOXEL Slicing Service

Separate service from the main voxel-website. Takes an uploaded .3mf
(or .stl), slices it with CuraEngine using an X1C-approximate PLA
profile, returns weight (g) and print time (h/m) as JSON.

## What's NOT done yet
- This was built and the STL-extraction step was tested against a real
  file, but the Docker build itself has not been run end-to-end (the
  sandbox that wrote it couldn't reach Conan's package server). Expect
  the first Render deploy to surface at least one build issue.
- The bookmarklet has NOT been updated yet to call this service - that
  comes after this is confirmed live, since it needs the real URL and
  needs testing against how MakerWorld actually structures its download
  links (untested/unknown from here).
- CuraEngine's profile in profiles/x1c_pla_approx.json is an
  approximation, not Bambu's real settings - if numbers come back
  consistently off vs. real Bambu Studio results, that file is where to
  tune it.

## Deploy steps (Render, Docker environment)
1. In GitHub, create a new folder in the same repo (or a new repo -
   either works) called `voxel-slicer-service` and upload every file
   from this delivery into it, preserving the folder structure
   (Dockerfile, server.js, package.json, profiles/, scripts/).
2. In Render: New > Web Service > connect the same GitHub repo.
3. Set Root Directory to `voxel-slicer-service` (or the path you used).
4. Render should auto-detect the Dockerfile and pick "Docker" as the
   environment. If it doesn't offer that automatically, set the
   Environment to Docker manually.
5. No environment variables are required - defaults are baked in.
6. Deploy. This will take a few minutes (compiling CuraEngine from
   source is the slow part, not npm install).
7. Once live, test it works with:
   `curl -F "file=@yourmodel.3mf" https://<new-service-url>/slice`
   It should return JSON with grams/printHours/printMinutes.
8. Send me the result (or the error) and we go from there.
