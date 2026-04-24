# Simple upload instructions

## GitHub

1. Create a new empty GitHub repository.
2. Click **Add file > Upload files**.
3. Drag the contents of this folder into GitHub.
4. Click **Commit changes**.

Upload the project files/folders such as `api`, `src`, `package.json`, `vercel.json`, etc.

Do not upload `node_modules`, `dist`, `.vercel`, `.env`, or `.env.local`.

## Vercel

1. In Vercel, click **Add New Project**.
2. Import your GitHub repository.
3. Use the default Vite settings:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Deploy.

## Optional AI Morning Note

To enable the Morning Note, add this environment variable in Vercel:

```text
GEMINI_API_KEY
```

Then redeploy.
