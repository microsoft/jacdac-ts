export interface JDError extends Error {
    code?: string
}

export default function errorCode(e: Error): string {
    return (e as JDError)?.code
}