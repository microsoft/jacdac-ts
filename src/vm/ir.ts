

interface Role {
    name: string
    service: string
}

interface GuardedCommand {
    guard?: jsep.Expression;
    command: jsep.CallExpression
}

interface Handler {
    wait: GuardedCommand
    commands: GuardedCommand[]
}

interface Program {
    roles: Role[]
    handlers: Handler[]
}

