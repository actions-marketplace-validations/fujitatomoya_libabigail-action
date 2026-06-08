#pragma once
// libfoo v2 — additions only, backward compatible with v1.
// Existing signatures are unchanged; one new free function is added.
namespace libfoo {

int add(int a, int b);
int multiply(int a, int b);

// New in v2: subtraction. Adding a new exported symbol is detected by
// abidiff as ABI_CHANGE without ABI_INCOMPATIBLE_CHANGE => verdict
// "additions-only".
int subtract(int a, int b);

}  // namespace libfoo
