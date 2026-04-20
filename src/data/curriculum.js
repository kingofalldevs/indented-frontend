export const modules = [
  {
    id: 1,
    title: "Module 1 — Welcome to C++",
    notes: "C++ is a high-performance, compiled language used for everything from video games (Unreal Engine) to operating systems and space flight software. It gives you direct control over hardware and memory, which is why it's incredibly fast. Learning C++ isn't just about syntax; it's about understanding how computers actually work. Get ready to build world-class logic!"
  },
  {
    id: 2,
    title: "Module 2 — Anatomy of a C++ Program",
    notes: "Every C++ program has a few essential parts. \n- `#include <iostream>`: This is your 'toolbox'. It lets you input and output data.\n- `int main()`: This is the 'engine' where execution starts.\n- `return 0;`: This tells the computer the program finished successfully.\n- `std::cout`: (Character Output) The screen's speaker—it 'says' things.\n- `std::cin`: (Character Input) The screen's ear—it 'listens' for typing.\n- `<<` and `>>`: These are 'directional arrows' for data flow."
  },
  {
    id: 3,
    title: "Module 3 — Data Types & Variables",
    notes: "Think of variables as named boxes in memory. \n- `int`: Whole numbers (1, -5).\n- `float`/`double`: Decimal numbers (3.14).\n- `char`: Single characters ('A').\n- `string`: Sentence or words (\"Hello\").\n- `bool`: True or False.\nNaming Rules: Must start with a letter/underscore. No spaces. No special symbols (except _)."
  },
  {
    id: 4,
    title: "Module 4 — Printing Text",
    notes: "To print text, we use `std::cout << \"Your text here\";`. We use `std::endl` or `\\n` to move to the next line. Remember, `std::cout` stands for 'standard console output'. It streams data out of your program and into the console terminal."
  },
  {
    id: 5,
    title: "Module 5 — Arithmetic",
    notes: "C++ supports all math: `+`, `-`, `*`, `/`. \nCRITICAL: `5 / 2` in C++ is `2`, not `2.5`, because both are integers. If you want `2.5`, at least one number must be a decimal (e.g., `5.0 / 2`). \n- `%` (Modulus): Gives you the remainder. `10 % 3` is `1`."
  },
  {
    id: 6,
    title: "Module 6 — Strings & Concatenation",
    notes: "You can combine strings using the `+` operator. \nExample: `string full = firstName + \" \" + lastName;`. \nYou can also mix strings with other variables in output: `std::cout << \"Age: \" << age;`."
  },
  {
    id: 7,
    title: "Module 7 — Checkpoint Quiz",
    notes: "Time to test your knowledge! This module is a practical exam. You must solve 5 challenges that require combining printing, input, arithmetic, and variables. Once you pass, Nova will unlock the next level of your training."
  },
  {
    id: 8,
    title: "Module 8 — Loops",
    notes: "Loops let you repeat code without typing it again. \n- `for`: Best when you know exactly how many times to repeat.\n- `while`: Best when you want to repeat 'as long as' something is true.\n- `do-while`: Same as while, but runs at least once regardless."
  },
  {
    id: 9,
    title: "Module 9 — Arrays",
    notes: "Arrays are lists of values of the same type. \n- `int scores[5];` creates space for 5 integers. \n- Indexing starts at 0! The first element is `scores[0]`. \nAlways use loops to process arrays efficiently."
  },
  {
    id: 10,
    title: "Module 10 — Final Gauntlet",
    notes: "This is it. You will be given a complex real-world problem (like building a bank system or a text-based game) and you must use everything you've learned. No hands-held. Prove you are a C++ master."
  }
];
