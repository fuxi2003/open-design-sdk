#!/bin/bash

cd sdk

typedoc --options ./typedoc.json --json "../sdk-docs-typedoc/dist/docs.json" || {
  cd ..
  exit 1
}

cd ..
