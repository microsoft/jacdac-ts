# JACDAC Multitool

Usage: Drop the `.uf2` generated in [Actions](https://github.com/microsoft/jacdac-multitool/actions) (or from a release) on your Arcade device.

Currently only works with F4 and D5 devices (of which only F4 was tested).

## Building

Use [makecode CLI](https://www.npmjs.com/package/makecode) to build.

```
> npm install -g makecode
> makecode
```

If you want develop just this package, do `makecode --pxt-modules` and then `code .`.
After that, build with simply `makecode`.

If you want to develop it alongside `pxt-jacdac`, clone `pxt-jacdac` in the same folder where this repo is cloned.
Then run `makecode --pxt-modules -c mkc-arcade.json` in `pxt-jacdac` (and remove `jacdac-multitool/pxt_modules` if any).
Then create a workspace with both by running `code jacdac-multitool pxt-jacdac`.
Finally, you will need to build with `makecode --config mkc-local.json` in `jacdac-multitool`.


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
