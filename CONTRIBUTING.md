# Contribution guide

To get set up install all modules required for development using `npm install`

## lint

This project is maintains a common code style, so before creating a PR make sure that
your code passes the Typescript linter using:

```
npm run lint
```

## building

```
npm run build
```

## testing

Any fixed bug as well as any new functionality should be confirmed to work by a new test. Tests
are located in `/test` and can be run using:

```
npm test
```

