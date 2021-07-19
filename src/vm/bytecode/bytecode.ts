// binary bytecode definition

// anything that is computed uses the stack (no registers)

// instruction types

// 0. control-flow

//    -	Nop
//    - Halt (handler doesn't run again)
//    - Reset (start handler again, jump to first instruction)
//    - Unconditional Jump
//    - Conditional Jump (pop?)
//    - Jump on error code

// 1. pure stack computation

//    - Push constant
//    - Function application (pop M arguments, push N arguments)

// 2. user variables

//    - read variable (push)
//    - write variable (pop?)

// 3. JD service (the only way to interact with the "environment")

//    - all instructions have a role operand (1 byte)
//    - role bound (poll/event)
//    - service command (16 bits, 4-bit operation, 12-bit code)
//      - action
//      - register read
//      - register write
//      - reserved
//      - events

// some instructions wait (events, state change, )
