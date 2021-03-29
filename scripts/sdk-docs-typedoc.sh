#!/bin/bash

rm -rf sdk-docs-typedoc/dist
mkdir sdk-docs-typedoc/dist

cd sdk

typedoc --options ./typedoc.json --json "../sdk-docs-typedoc/dist/docs.json" || {
  cd ..
  exit 1
}

cd ..
