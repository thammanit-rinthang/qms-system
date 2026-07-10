# Hooks Folder Rules

This folder owns client hooks and data-fetching hooks.

## Hook Rules

- Use TanStack Query for data fetching.
- Do not use raw `useEffect` fetching.
- Keep hooks focused on data access and state coordination.
- Do not put UI rendering logic in hooks.
- Do not put business logic that belongs in services into hooks.

## Failure Conditions

- A hook fetches data manually with `useEffect` when a query abstraction exists.
- A hook becomes a hidden place for business rules.
