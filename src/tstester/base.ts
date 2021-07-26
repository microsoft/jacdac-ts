// Contains foundational abstractions for the testing system

// TODO separate out some kind of human (tester) interface class? which can have different implementations,
// eg web button or physical Jacdac module button?

// Something that can be listened on and represents an instant in time
abstract class TesterEvent {

}

// A condition that can be asserted for a duration, implemented as listeners
abstract class TesterCondition {

}
