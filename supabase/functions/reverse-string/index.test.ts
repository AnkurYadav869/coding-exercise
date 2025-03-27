import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { reverseString } from "./index.ts";

Deno.test("reverseString - reverses a simple string", () => {
  const input = "hello";
  const expected = "olleh";
  const result = reverseString(input);
  assertEquals(result, expected);
});

Deno.test("reverseString - reverses a string with spaces", () => {
  const input = "hello world";
  const expected = "dlrow olleh";
  const result = reverseString(input);
  assertEquals(result, expected);
});

Deno.test("reverseString - reverses a string with special characters", () => {
  const input = "hello!@#$%^&*()";
  const expected = ")(*&^%$#@!olleh";
  const result = reverseString(input);
  assertEquals(result, expected);
});

Deno.test("reverseString - handles empty string", () => {
  const input = "";
  const expected = "";
  const result = reverseString(input);
  assertEquals(result, expected);
});

Deno.test("reverseString - handles palindrome", () => {
  const input = "racecar";
  const expected = "racecar";
  const result = reverseString(input);
  assertEquals(result, expected);
}); 