# Open Design SDK

## Component Responsibilities

### Facade

- Orchestrates the high-level logic of loading and persisting of design files and working with their contents.
- Hides most platform/technology differences
- Makes working with design files very straight-forward
- Has the concept of design, page and artboard entities
- Manages in-memory state but does not keep the design data themselves

### Octopus Reader

- Keeps the state (loaded designs)
- Does not work with design file locations or any design IDs

### API Client

- Fetches design data from a remote service (Open Design API)
- Does not keep any state
- Uploads design files to the remote service
- Has the concept of an ID-based design storage
- Does not work with file locations

### Local Data Manager

- Loads octopus design data from the local storage (the file system)
- Saves octopus design data to the local storage
- Manages temporary working state of design files
- Has the concept of an filename-based design storage
- Has the concept of "octopus files"
- Does not work with any design IDs
