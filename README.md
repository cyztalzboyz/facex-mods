# facex-render-watch

A Claude Code mod for FaceX reel production. It spots render commands (ffmpeg, Blender, Remotion, Puppeteer/Playwright, render scripts), lists them live in a "FaceX renders" pane (`/renders`), shows a status line while they run, and pops a toast with the file name and time taken when each render finishes, background renders included.

## Install

At the prompt of a terminal session:

```
/plugin install facex-render-watch --marketplace <owner>/<repo>
```

From a shell:

```
claude plugin install facex-render-watch --marketplace <owner>/<repo>
```

In the desktop app: click + next to the prompt box, then Plugins, Add marketplace with `<owner>/<repo>`, then Add plugin.
