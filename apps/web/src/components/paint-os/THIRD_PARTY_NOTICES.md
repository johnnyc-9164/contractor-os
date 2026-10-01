# Third-party source and assets

Card, Table and Textarea include source retrieved from the official shadcn registry. Its MIT license is in LICENSE.shadcn.md. Imports are adapted to this package. Button styling was adapted from the previously retrieved shadcn source, replacing Slot composition with the actual Base UI Button. Checkbox, Switch, Slider, Separator and Input are local shadcn-style wrappers over actual `@base-ui/react` primitives, checked against official documentation and installed package declarations; they are not claimed to be exact upstream registry files. Other components use native semantic elements and shadcn token conventions. Icons use lucide-react. There are no Radix runtime dependencies. The upstream-registry manifest includes the unchanged retrieved Card, Table and Textarea sources. Current primitive provenance is recorded in base-ui-conversion.json.

The original PaintPro HTML, screenshots, sample data, external image URLs and layout CSS were supplied by the user. Their availability and commercial redistribution rights have not been independently verified. Screenshots are included for comparison. No private company records were imported.

Official reference sources:
- https://ui.shadcn.com/docs/components/base/button
- https://ui.shadcn.com/docs/components/card
- https://ui.shadcn.com/docs/components/native-select
- https://ui.shadcn.com/docs/components/table
- https://ui.shadcn.com/docs/components/field
- https://ui.shadcn.com/docs/components/checkbox
- https://ui.shadcn.com/docs/components/switch
- https://ui.shadcn.com/docs/components/slider

The shadcn CLI docs/search commands were attempted but its registry host refused the connection in this runtime. Official documentation and retrievable registry items were used for the conversion. Dependencies were successfully installed through npm.

Base UI API references: https://base-ui.com/react/components/button, checkbox, switch, slider, separator and input (same component URL pattern).
