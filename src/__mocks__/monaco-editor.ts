const monaco = {
  editor: {
    defineTheme: jest.fn(),
    create: jest.fn().mockReturnValue({
      dispose: jest.fn(),
      onDidChangeCursorPosition: jest
        .fn()
        .mockReturnValue({ dispose: jest.fn() }),
      getModel: jest.fn().mockReturnValue({
        getOffsetAt: jest.fn().mockReturnValue(0),
      }),
    }),
    setTheme: jest.fn(),
  },
  languages: {
    register: jest.fn(),
    setMonarchTokensProvider: jest.fn(),
    setLanguageConfiguration: jest.fn(),
  },
};

export default monaco;
