# Jacdac Services for MakeCode

This project contains [Jacdac](https://aka.ms/jacdac) host and client services for MakeCode editors.

**This project is still under construction.**

## Using this extensions

* Open your MakeCode editor (see supported editors)
* Go to the extension dialog and search for https://github.com/microsoft/pxt-jacdac
* Import the extension.

### Supported editors

* Maker, https://maker.makecode.com
* Arcade BETA, https://arcade.makecoe.com/beta
* micro:bit Beta, https://makecode.microbit.org/beta

## Developer section

Issues are tracked at https://github.com/microsoft/jacdac/issues .

To build all projects
```
sh mk.sh
```

To refresh the ``constants.ts`` files, build jacdac-spec (``yarn buildspecs`` from jacdac-ts) from https://github.com/microsoft/jacdac-ts .

## Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
