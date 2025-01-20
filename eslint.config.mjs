import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginJest from 'eslint-plugin-jest'
import eslintPluginPrettier from 'eslint-config-prettier'

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        files: ['*.test.ts'],
        ...pluginJest.configs['flat/recommended'],
        ...pluginJest.configs['flat/style'],
        rules: {
            'jest/expect-expect': [
                'error',
                {
                    assertFunctionNames: ['expect', 'verify'],
                },
            ],
        },
    },
    eslintPluginPrettier,
    {
        ignores: ['src/tests/**'],
    },
    {
        rules: {
            // Allow unused variables starting with exactly one underscore.
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_[^_].*$|^_$',
                    varsIgnorePattern: '^_[^_].*$|^_$',
                    caughtErrorsIgnorePattern: '^_[^_].*$|^_$',
                },
            ],
        },
    },
)
