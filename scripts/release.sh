#!/bin/bash

log() {
  echo -e "\x1b[90m  \x1b[0m$*"
}

logWarning() {
  log "⚠️  $*"
}

logSuccess() {
  log "✅ $*"
}

logError() {
  log "❌ $*"
}

checkInput() {
  if [[ "$VERSION" == "" ]]
  then
    logError "\$VERSION not specified"
    return 1
  fi
}

checkRepositoryState() {
  local gitStatus=$(git status --short --porcelain)
  if [[ "$gitStatus" != "" ]]
  then
    logError "Repository has uncommited changes"
    return 1
  fi
}

restoreCommit() {
  echo ""
  log "Restoring original repository state…"

  git reset --hard HEAD \
    || logWarning "Failed to restore the original repository state"
}

bumpPackageVersions() {
  echo ""
  log "Bumping package versions…"

  ts-node ./scripts/bump-versions.ts || return 1

  logSuccess "Versions bumped"
}

buildPackages() {
  echo ""
  log "Building packages…"

  yarn build:octopus-reader || return 1
  yarn build:api || return 1
  yarn build:sdk || return 1
  yarn build:sdk-docs-typedoc || return 1
}

releasePackages() {
  echo ""
  log "Releasing packages as version ${VERSION}…"

  yarn workspace @opendesign/octopus-reader publish --access=public --new-version "$VERSION" --no-git-tag-version --ignore-scripts || return 1
  yarn workspace @opendesign/api publish --access=public --new-version "$VERSION" --no-git-tag-version --ignore-scripts || return 1
  yarn workspace @opendesign/rendering publish --access=public --new-version "$VERSION" --no-git-tag-version --ignore-scripts || return 1
  yarn workspace @opendesign/sdk publish --access=public --new-version "$VERSION" --no-git-tag-version --ignore-scripts || return 1
  yarn workspace @opendesign/sdk-docs-typedoc publish --access=public --new-version "$VERSION" --no-git-tag-version --ignore-scripts || return 1

  echo ""
  logSuccess "Packages successfully released"
}

commitRelease() {
  echo ""
  log "Bumping root version…"

  yarn version --no-git-tag-version --new-version "$VERSION" \
    && logSuccess "Version bump successful" \
    || return 1

  echo ""
  log "Committing version bump…"

  git add . && git commit -m "v$VERSION" \
    && logSuccess "Version bump committed" \
    || return 1

  echo ""
  log "Tagging source code…"

  git tag "v$VERSION" \
    && logSuccess "Source code tagged as v$VERSION" \
    || return 1
}

main() {
  checkInput || return 1
  checkRepositoryState || return 1

  log "Starting release procedure for version $VERSION"

  bumpPackageVersions || {
    restoreCommit
    return 1
  }

  buildPackages || {
    restoreCommit
    return 1
  }

  releasePackages || {
    echo ""
    logWarning "Not restoring the original repository state"
    return 1
  }

  commitRelease || {
    echo ""
    logWarning "The packages @opendesign/sdk, @opendesign/octopus-reader, @opendesign/api, @opendesign/rendering and @opendesign/sdk-docs-typedoc have already been released!"
    logWarning "Not restoring the original repository state"
    return 1
  }
}

echo ""
main && {
  echo ""
  exit 0
} || {
  echo ""
  exit 1
}
