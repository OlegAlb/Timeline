# Interactive Booking Scheduler

[Русский](README.ru.md) | English

A high-performance booking scheduler built with React Native, Skia, Reanimated and Gesture Handler.

The project demonstrates techniques commonly used in calendar, reservation and resource-planning systems, including canvas rendering, gesture orchestration, coordinate transformations and scheduling constraints.

---

## Demo

<video src="assets/video/demo.mp4" width="100%" controls></video>

## Features

### Rendering

- GPU-accelerated rendering using React Native Skia
- Virtualized coordinate system
- Sticky header and resource sidebar
- Real-time current time indicator
- Zoomable timeline

### Interactions

- Pan navigation
- Pinch-to-zoom
- Drag & Drop booking repositioning
- Booking resize handles
- Tap-to-create booking
- Gesture conflict resolution

### Scheduling Logic

- Collision detection
- Minimum booking duration enforcement
- Minimum gap enforcement
- End-of-day constraints
- Resource-based booking placement

### Architecture

- React Native
- TypeScript
- React Native Skia
- React Native Reanimated
- React Native Gesture Handler
- Zustand

---

## Architecture Overview

```text
User Input
    │
    ▼
Gesture Engine
    │
    ▼
Coordinate System
(Screen → Canvas → Domain)
    │
    ▼
Scheduling Rules
    │
    ▼
State Management
    │
    ▼
Canvas Rendering
```

---

## Coordinate Spaces

The application operates using three coordinate systems:

### Screen Coordinates

Raw touch input from the device.

### Canvas Coordinates

Coordinates adjusted for:

- scrolling
- zoom level
- sticky regions

### Domain Coordinates

Business-level coordinates:

- resource
- time

This separation allows interaction logic to remain independent from rendering transformations.

---

## Gesture System

Interactions are orchestrated through a dedicated Gesture Engine.

```text
Gesture Engine
├── Pan
├── Pinch
├── Drag Booking
├── Resize Booking
└── Tap Cell
```

Gesture conflicts are resolved using exclusive and simultaneous gesture composition.

---

## Performance Considerations

### Current

- Canvas rendering through Skia
- Worklet-based gesture processing
- SharedValue-driven viewport updates

### Future Optimizations

- Viewport-aware grid virtualization
- Spatial indexing for hit-testing
- Row-based booking indexing
- Collaborative scheduling

---

## Testing Strategy

Critical business logic is isolated from rendering and can be unit tested independently.

Examples:

- Coordinate transformations
- Collision detection
- Time calculations
- Booking validation

---

## Future Roadmap

- Undo / Redo
- Recurring bookings
- Offline-first synchronization
- Real-time collaborative editing
- Resource grouping
- Multi-day scheduling

---

## Why This Project Exists

Most scheduling systems combine:

- complex rendering
- gesture-heavy interactions
- domain-specific business rules

This project explores how those concerns can be separated while maintaining performance and scalability in React Native.
