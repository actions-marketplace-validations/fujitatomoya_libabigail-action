#pragma once
// libfoo v3 — ABI-incompatible change relative to v1.
// multiply()'s return type changed from int to long: existing callers
// linked against v1 would now read a wider value off the wire, so abidiff
// reports ABI_INCOMPATIBLE_CHANGE.
namespace libfoo {

int  add(int a, int b);
long multiply(int a, int b);  // CHANGED: int -> long

}  // namespace libfoo
