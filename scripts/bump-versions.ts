import { exec } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'

function execYarnJson(command: string) {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout) => {
      if (err) {
        reject(err)
        return
      }

      const json = stdout.replace(/^[^{]*?/, '').replace(/[^}]*?$/, '')

      try {
        const data = JSON.parse(json)
        resolve(data)
      } catch (parseErr) {
        console.error('Failed parsing Yarn JSON')
        console.log(json)
        reject(parseErr)
      }
    })
  })
}

function readJsonFile(relPath: string) {
  const json = readFileSync(relPath, 'utf8')
  try {
    return JSON.parse(json)
  } catch (err) {
    console.error('Failed to parse JSON file', relPath)
    throw err
  }
}

function writeJsonFile(relPath: string, data: unknown) {
  const json = `${JSON.stringify(data, null, 2)}\n`
  writeFileSync(relPath, json)
}

async function main() {
  const nextVersion = process.env['VERSION']
  if (!nextVersion) {
    throw new Error('VERSION not specified')
  }

  const workspaceTree = (await execYarnJson(
    'yarn workspaces info --json'
  )) as Record<
    string,
    {
      'location': string
      'workspaceDependencies': Array<string>
      'mismatchedWorkspaceDependencies': Array<string>
    }
  >

  const workspaceNames = Object.keys(workspaceTree) as Array<string>

  workspaceNames.forEach((workspaceName) => {
    const workspaceInfo = workspaceTree[workspaceName]
    if (!workspaceInfo) {
      return
    }

    const pkgRelPath = `./${workspaceInfo['location']}/package.json`
    const pkgInfo = readJsonFile(pkgRelPath)
    pkgInfo['version'] = nextVersion

    const depNames: Array<string> = workspaceInfo['workspaceDependencies'] || []

    const pkgDeps = pkgInfo['dependencies']
    if (pkgDeps) {
      depNames.forEach((depName) => {
        if (pkgDeps[depName]) {
          pkgDeps[depName] = nextVersion
        }
      })
    }

    const pkgDevDeps = pkgInfo['devDependencies']
    if (pkgDevDeps) {
      depNames.forEach((depName) => {
        if (pkgDevDeps[depName]) {
          pkgDevDeps[depName] = nextVersion
        }
      })
    }

    writeJsonFile(pkgRelPath, pkgInfo)
  })
}

main().then(
  () => {
    process.exit(0)
  },
  (err) => {
    console.error(err)
    process.exit(1)
  }
)
