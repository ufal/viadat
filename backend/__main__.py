# This is here so that `python3 -m backend create-user test --password test` (from Dockerfile) works
from .cmd import main

main()
