# Open Design SDK Testing Session Instructions

Forgive the alpha state of the repository. We currently do not have a release process in place and the testing session build is not available via NPM.

You will have to clone the repo, build the code and then run it.

- Clone the repo

  ```bash
  git clone git@gitlab-ssh.avcd.cz:opendesign/open-design-sdk.git && cd open-design-sdk
  ```

- Checkout the testing session code snapshot

  ```bash
  git checkout testingsession1
  ```

- Install dependencies

  ```bash
  yarn
  ```

- Build the documentation

  ```
  yarn workspace @opendesign/sdk run build:docs
  ```

  The documentation is generated inside `sdk/docs`. You can browse it by opening `sdk/docs/index.html` in a web browser.

- The build process is not currently finished so you will have to use `ts-node` (or raw `tsc`) and work with the original TypeScript code directly by importing `sdk/src`.

  ```bash
  $ yarn add ts-node # or install globally: yarn global add ts-node
  $ ./node_modules/.bin/ts-node # or globally: ts-node
  ```

  ```typescript
  import { createSdk } from './sdk/src'

  const sdk = createSdk({
    token: 'abc',
    apiRoot: 'https://opendesign.avcd.cz/api',
  })
  // Obtain an access token from the ODAPI docs:
  //   - Staging: https://opendesign.avcd.cz/docs/authentication
  //   - Produciton: https://opendesign.avocode.com/docs/authentication
  // The apiRoot defaults to the production ODAPI root.
  ```

- Read the documentation and test the SDK works and behaves in ways you would expect and seem natural to you.

- Please report any issues you uncover or anything unusual or unexpected you encounter. I would also love some feedback on the documentation content.

  - Here is a **testing session issue** in GitLab: https://gitlab.avcd.cz/opendesign/open-design-sdk/-/issues/1
