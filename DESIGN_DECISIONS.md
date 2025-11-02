# Design Decisions & Trade-offs

## State Management: Zustand over Redux

### Why Zustand?

**Simplicity & Boilerplate**
- Zustand requires minimal setup—no providers, reducers, or action creators
- Redux would add ~200+ lines of boilerplate for actions, reducers, and store configuration
- For this app's scope (single state machine with 7 states), Zustand's simplicity is ideal

**TypeScript Integration**
- Zustand offers first-class TypeScript support with minimal type definitions
- Redux requires separate types for actions, reducers, state, and dispatch
- Our store is fully typed in ~150 lines vs. Redux's ~300+ lines for equivalent functionality

**Performance**
- Zustand uses direct state subscription without context providers
- No unnecessary re-renders—components subscribe only to state slices they need
- Redux would require careful memoization and selector optimization

**Learning Curve**
- Zustand's API is intuitive: `useVoiceStore()` returns state and actions directly
- Redux requires understanding middleware, thunks/sagas for async, and immutability patterns
- Team onboarding is faster with Zustand's straightforward approach

**Bundle Size**
- Zustand: ~1.2KB gzipped
- Redux + Redux Toolkit: ~12KB gzipped
- For a mobile app, every KB matters

### Trade-offs Accepted

**Limited Ecosystem**
- Redux has mature DevTools, middleware, and community patterns
- Zustand's DevTools are basic but sufficient for this app's debugging needs
- Decision: Accepted—our state machine is simple enough to debug without advanced tooling

**No Time-Travel Debugging**
- Redux DevTools offer time-travel for state history
- Zustand doesn't support this natively
- Decision: Not needed—our state transitions are linear and errors are logged

**Less Prescriptive**
- Redux enforces patterns (actions, reducers, immutability)
- Zustand is flexible, which can lead to inconsistent patterns in larger teams
- Decision: For this single-developer project, flexibility is an advantage

### When Redux Would Be Better

- **Large teams** needing strict patterns and conventions
- **Complex state** with deeply nested updates and normalization
- **Advanced debugging** requirements with time-travel
- **Existing Redux ecosystem** integration (e.g., Redux-Saga, Redux-Persist)

### Conclusion

For this PTT app with a clear state machine, minimal async complexity, and tight deadline, Zustand provides the optimal balance of simplicity, performance, and maintainability. The decision prioritizes shipping a clean, working product over enterprise-scale architecture.
