"""Render the 3D frames for one beat.

    python3 render.py BEAT ASPECT [--scale 0.5] [--samples 40] [--fps 24]

Resumable: existing frames are skipped. 4:5 is a centre crop of the 9:16 render
(same camera, horizontal sensor fit), so only 9x16 and 16x9 are rendered.
Each beat gets HANDLE seconds of extra footage at both ends for the dissolves.
"""
import os, sys, time
import bpy
import config as C, scene

HANDLE = 0.25


def frame_times(beat, fps):
    a, z = C.BEATS[beat]
    dur = z - a
    start = 0.0 if beat == 1 else -HANDLE
    n0, n1 = round(start * fps), round((dur + HANDLE) * fps)
    return [(i, i / fps) for i in range(n0, n1 + 1)]


def frame_path(beat, aspect, i):
    return os.path.join(C.OUT, "frames", aspect, "b{}".format(beat), "f{:+05d}.png".format(i))


def label_path(beat, aspect, i):
    return frame_path(beat, aspect, i).replace(".png", "_labels.png")


def render_passes(beat, t, aspect, i, scale, samples):
    """Beauty pass at reduced size, then a full-size emission-only pass for the labels so type stays crisp."""
    D = bpy.data
    update = scene.prepare(beat, aspect)
    sc = bpy.context.scene
    sc.cycles.use_animated_seed = False
    sc.cycles.adaptive_threshold = 0.05
    w, h = C.ASPECTS[aspect]
    sc.render.resolution_x, sc.render.resolution_y = w, h
    update(t)
    geo = [o for o in D.objects if o.type in ("MESH", "FONT")]
    labs = [o for o in geo if o.data.materials and o.data.materials[0] == scene.M["label"]]
    state = {o: o.hide_render for o in geo}
    for o in labs:
        o.hide_render = True
    sc.render.film_transparent = False
    sc.render.resolution_percentage = int(scale * 100)
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    scene.S["cam"].data.dof.use_dof = True
    sc.render.image_settings.color_mode = "RGB"
    tmp = frame_path(beat, aspect, i) + ".tmp.png"
    sc.render.filepath = tmp
    bpy.ops.render.render(write_still=True)
    if any(not state[o] for o in labs):
        for o in geo:
            o.hide_render = state[o] or o not in labs
        sc.render.film_transparent = True
        sc.render.resolution_percentage = 100
        sc.cycles.samples = 6
        sc.cycles.use_denoising = False
        scene.S["cam"].data.dof.use_dof = False
        sc.render.image_settings.color_mode = "RGBA"
        sc.render.filepath = label_path(beat, aspect, i)
        bpy.ops.render.render(write_still=True)
    for o in geo:
        o.hide_render = state[o]
    os.replace(tmp, frame_path(beat, aspect, i))


if __name__ == "__main__":
    beat, aspect = int(sys.argv[1]), sys.argv[2]
    opt = dict(zip(sys.argv[3::2], sys.argv[4::2]))
    scale, samples, fps = float(opt.get("--scale", 0.5)), int(opt.get("--samples", 40)), int(opt.get("--fps", 24))
    limit = int(opt.get("--limit", 10 ** 9))
    only = opt.get("--only")
    todo = [(int(only), int(only) / fps)] if only else [(i, t) for i, t in frame_times(beat, fps) if not os.path.exists(frame_path(beat, aspect, i))][:limit]
    if beat == 5 and not only:
        todo = todo[:1] if not os.path.exists(frame_path(5, aspect, 0)) else []
        todo = [(0, 4.0)] if todo else []
    t0 = time.time()
    for k, (i, t) in enumerate(todo):
        render_passes(beat, t, aspect, i, scale, samples)
        if k % 10 == 0:
            print("beat", beat, aspect, k + 1, "/", len(todo), "avg", round((time.time() - t0) / (k + 1), 1), "s/frame", flush=True)
    print("DONE beat", beat, aspect, len(todo), "frames", round(time.time() - t0), "s", flush=True)
