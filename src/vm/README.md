# Jacdac DSL

The Jacdac domain-specific language (JdDSL) is a simple reactive language that 
is supported by the Jacdac Virtual Machine (JdVM). A JdDSL program is represented
by the VMProgram interface found in file `ir.ts`. A program has:
- a set of (client) roles, each having a type of Jacdac service
- a set of server roles, each also having a type of Jacdac service
- a set of handlers, each consisting of straight-line code (no loops for now)
- a set of global variables 

Currently, JdDSL does not support user-defined loops, functions, or data structures.

# Handlers

Each handler begins with a 


# Implementation
