# BANKING77

Source: [PolyAI task-specific datasets](https://github.com/PolyAI-LDN/task-specific-datasets/tree/9d081458ff52e53cf7e848f414e6e9344e4e6696/banking_data).

- `banking77-test.csv`: original, unmodified official test split; 3,080 rows, 77 intents.
- `categories.json`: original category list, unmodified.
- `taxonomy.json`: this project's explicit mapping into 12 operational workflows, used for primary scoring. The raw label remains available in advanced mode. Every category appears exactly once.

Pinned source revision: `9d081458ff52e53cf7e848f414e6e9344e4e6696`.

Test CSV SHA-256: `d12d6e3bc4c3103966ae786dc435913c0c563dfa328f5a3646d0e62cfeeb474d`.

BANKING77 is © PolyAI Limited and licensed under [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/). This dataset license is separate from the application's MIT license. Query text is redistributed unchanged. Operational taxonomy and illustration selection are additions by this project.

Cite: Iñigo Casanueva, Tadas Temčinas, Daniela Gerz, Matthew Henderson, Ivan Vulić. **Efficient Intent Detection with Dual Sentence Encoders**. NLP4ConvAI, ACL 2020. https://arxiv.org/abs/2003.04807

`public/demo.json` selects two test messages per intent using seed 71. **Its model outputs are simulated.** Regenerate with `python3 experiments/build_demo.py` (Python 3 standard library only). Nothing in this fixture is a measured API result.
