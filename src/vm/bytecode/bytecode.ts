// binary bytecode definition

// lookup tables

// role -> { name: string, serviceClass: uint32, client: boolean }

// types
// - int, float, string, boolean
// - single record (JSON, JD Event/Command payload)

// anything that is computed uses the stack (no registers)

enum BytecodeInstructions {
    NOP = 0,      // do nothing
    HALT,         // halt the handler
    RESET,        // reset the handler
    FAIL,         // fail the handler
    JUMP_UNCOND,
    JUMP_COND,    // EQ0, GT0, LT0, GE0, LE0
    JUMP_ERROR,

    USER_VAR_SET = 16,
    USER_VAR_GET,
    JD_SERVICE,     // send to network
    ON_JD_SERVICE,  // wait for register get/set, event, command
    ROLE_BOUND,     // query if role is bound

    LOAD_INT = 32,
    LOAD_FLOAT,
    LOAD_STRING,
    
    UNARY_MINUS = 40,
    UNARY_ABS,
    UNARY_BANG,
    UNARY_NOT,
    UNARY_PLUS,

    BINARY_PLUS = 56,
    BINARY_MINUS,
    BINARY_DIV,
    BINARY_MULT,
    BINARY_MOD,
    BINARY_RSHIFT,
    BINARY_LSHIFT,
    BINARY_OR,
    BINARY_AND,
    BINARY_XOR,
    BINARY_EQ,
    BINARY_NEQ,
    BINARY_TEQ,
    BINARY_TNE,
    BINARY_LT,
    BINARY_GT,
    BINARY_LE,
    BINARY_GE,

    SLEEP = 96,
    WAIT_REGISTER_CHANGE,     

    REST = 128,
}

// 3. JD service (the only way to interact with the "environment")

//    - all instructions have a role operand (1 byte)
//    - service command (16 bits, 4-bit operation, 12-bit code)
//      - action
//      - register read
//      - register write
//      - reserved
//      - events

// 4. JD runtime
//    - role bound (poll/event)

// some instructions wait

// - await service_command
// - wait time
// - higher-level
//   - wait for register to change by <expr>
//   - wait for condition
//   - wait for event with condition