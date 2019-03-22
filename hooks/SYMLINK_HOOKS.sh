#!/usr/bin/bash

HOOKS_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

for filename in "${HOOKS_DIR}/*"; do
    cp --symbolic-link $filename "${HOOKS_DIR}/../.git/hooks"
done
