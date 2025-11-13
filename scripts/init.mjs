// Tiny init script to set project name, scope, and framework version.
    // Usage:
    //   node scripts/init.mjs --name=my-game --scope=YOUR_GH_USER_OR_ORG --framework=latest
    import fs from 'node:fs';
    import path from 'node:path';

    function parseArgs() {
      const out = {};
      for (const arg of process.argv.slice(2)) {
        const [k, v] = arg.split('=');
        if (k.startsWith('--')) out[k.slice(2)] = v ?? true;
      }
      return out;
    }

    function patchJSON(file, patch) {
      const p = path.resolve(file);
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
      const next = patch(data) || data;
      fs.writeFileSync(p, JSON.stringify(next, null, 2) + '\n');
    }

    const args = parseArgs();
    const name = args.name || 'my-2d-game';
    const scope = args.scope || 'SCOPE';
    const frameworkVer = args.framework || 'latest';

    // 1) package.json
    patchJSON('./package.json', (pkg) => {
      pkg.name = name;
      pkg.dependencies = pkg.dependencies || {};
      const scopedName = `@${scope}/pwa-game-2d-framework`;
      pkg.dependencies[scopedName] = frameworkVer;
      // remove placeholder
      delete pkg.dependencies['@SCOPE/pwa-game-2d-framework'];
      return pkg;
    });

    // 2) .npmrc (scope)
    const npmrcPath = path.resolve('./.npmrc');
    if (fs.existsSync(npmrcPath)) {
      let content = fs.readFileSync(npmrcPath, 'utf-8');
      content = content.replaceAll('@SCOPE', `@${scope}`);
      fs.writeFileSync(npmrcPath, content);
    }

    // 3) Update imports in source (replace @SCOPE with @<scope>)
    function replaceInFiles(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) replaceInFiles(full);
        else if (entry.isFile() && /\.(ts|tsx|js|mjs)$/.test(entry.name)) {
          let text = fs.readFileSync(full, 'utf-8');
          if (text.includes('@SCOPE/')) {
            text = text.replaceAll('@SCOPE/', `@${scope}/`);
            fs.writeFileSync(full, text);
          }
          if (text.includes('@NAME')) {
            text = text.replaceAll('@NAME', `${name}`);
            fs.writeFileSync(full, text);
          }
        }
      }
    }
    replaceInFiles('./src');

    console.log(`✔ Project initialized:
      - name: ${name}
      - scope: @${scope}
      - framework: ${frameworkVer}

    Next:
      pnpm install
      pnpm dev
    `);
