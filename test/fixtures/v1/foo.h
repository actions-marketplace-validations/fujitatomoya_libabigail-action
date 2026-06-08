#pragma once
// libfoo v1 — baseline ABI.
// Build with -g -fPIC -shared.
namespace libfoo {

// Returns a + b.
int add(int a, int b);

// Returns a * b.
int multiply(int a, int b);

}  // namespace libfoo
