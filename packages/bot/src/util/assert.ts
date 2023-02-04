import { container } from 'tsyringe';
import { Env } from '../struct/Env.js';
import { logger } from './logger.js';

export function assertDebug(assertion: boolean, error: Error) {
	const env = container.resolve(Env);
	if (!assertion) {
		if (env.isProd) {
			logger.error(
				{ err: error },
				'Debug assertion failed. This means we ran into an undefined state that we can still recover from.',
			);
		} else {
			throw error;
		}
	}
}

// Helpers for type assertions
export type PropsNotNullOrUndefined<TRecord extends Record<string, unknown>, TKeys extends keyof TRecord> = {
	[TKey in keyof Omit<TRecord, TKeys>]: TRecord[TKey];
} & {
	[TKey in keyof Pick<TRecord, TKeys>]-?: NonNullable<TRecord[TKey]>;
};

type TypeAssertionCallback<TAssertFrom, TAssertsTo extends TAssertFrom> = (value: TAssertFrom) => value is TAssertsTo;

export function createTypeNarrowingAssertion<TAssertFrom, TAssertTo extends TAssertFrom>(
	assert: TypeAssertionCallback<TAssertFrom, TAssertTo>,
) {
	return (value: TAssertFrom, error: Error): asserts value is TAssertTo => {
		if (!assert(value)) {
			throw error;
		}
	};
}

/**
 * Creates a type-narrowing assertion function that will hard-crash the process in development mode if the assertion fails.
 * In production, the assertion will only cause a warning to be logged.
 */
export function createTypeNarrowingDebugAssertion<TAssertFrom, TAssertTo extends TAssertFrom>(
	assert: TypeAssertionCallback<TAssertFrom, TAssertTo>,
) {
	const env = container.resolve(Env);
	return (value: TAssertFrom, error: Error): asserts value is TAssertTo => {
		if (!assert(value)) {
			if (env.isProd) {
				logger.error(
					{ err: error, value },
					'Debug assertion failed. This means we ran into an undefined state that we can still recover from.',
				);
			} else {
				throw error;
			}
		}
	};
}
