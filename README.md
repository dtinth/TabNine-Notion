# TabNine-Notion

A proof-of-concept that shows that it is possible to integrate TabNine with Notion.

**Note:** This project is not a ready-to-use implementation and requires some tinkering.

## About the proof-of-concept

There are two main parts involved in this proof-of-concept:

1. A Node.js script that runs an HTTP server and communicates with TabNine.
2. A content script that you need to copy and paste into JavaScript Console.

## Prerequisites

- Node.js
- Yarn
- Bash

## Set-up

1.  Install the dependencies:

        yarn

2.  Download the TabNine binaries:

        ./dl_binaries.sh

3.  Start the server and point it to the TabNine binary (note: replace the path with the correct version):

        yarn start ./binaries/2.6.0/x86_64-apple-darwin/TabNine

4.  Open `tabnine-notion-script.js` and copy the contents of the file into the JavaScript Console.
5.  Type `TabNine::config`. If you use Deep TabNine Cloud only on whitelisted directories, you need to whitelist `/notion`.
