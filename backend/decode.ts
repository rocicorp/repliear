import * as t from "io-ts";
import { isLeft, Either } from "fp-ts/lib/Either";
import { failure } from "io-ts/lib/PathReporter";

export function must<T>(result: Either<t.ValidationError[], T>): T {
  if (isLeft(result)) {
    throw new Error(failure(result.left).join("\n"));
  }
  return result.right;
}
