import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'api.dart';
import 'formats.dart';
import 'models.dart';
import 'components/ui/index.dart';
import 'theme/app_colors.dart';
import 'theme/app_theme.dart';
import 'theme/app_typography.dart';

class CartLine {
  final Product product;
  final int? variantId;
  final List<int> optionIds;
  int qty;
  String notes;

  CartLine({
    required this.product,
    this.variantId,
    this.optionIds = const [],
    this.qty = 1,
    this.notes = '',
  });

  String get key {
    final opts = [...optionIds]..sort();
    return '${product.id}:${variantId ?? 0}:${opts.join(',')}';
  }

  double get unitPrice {
    var price = product.price;
    for (final v in product.variants) {
      if (v.id == variantId) price = v.price;
    }
    for (final o in product.options) {
      if (optionIds.contains(o.id)) price += o.price;
    }
    return price;
  }

  double get subtotal => unitPrice * qty;

  String get description {
    final parts = <String>[];
    for (final v in product.variants) {
      if (v.id == variantId) parts.add(v.name);
    }
    for (final o in product.options) {
      if (optionIds.contains(o.id)) parts.add(o.name);
    }
    return parts.join(' · ');
  }
}

class ProductsTab extends StatefulWidget {
  const ProductsTab({
    super.key,
    required this.products,
    required this.loading,
    required this.error,
    required this.onRefresh,
    required this.onReceipt,
  });

  final List<Product> products;
  final bool loading;
  final String error;
  final Future<void> Function() onRefresh;
  final Future<void> Function(int id) onReceipt;

  @override
  State<ProductsTab> createState() => _ProductsTabState();
}

class _ProductsTabState extends State<ProductsTab> {
  final List<CartLine> _cart = [];
  final _searchCtrl = TextEditingController();
  String _cat = 'Semua';
  final _customerCtrl = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _searchCtrl.dispose();
    _customerCtrl.dispose();
    super.dispose();
  }

  void _snack(String msg, {bool error = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: error ? AppColors.danger : null,
    ));
  }

  List<Product> get _activeProducts =>
      widget.products.where((p) => p.isActive).toList();

  List<String> get _categories {
    final s = <String>{'Semua'};
    for (final p in _activeProducts) {
      s.add(p.categoryName.isEmpty ? 'Lainnya' : p.categoryName);
    }
    return s.toList();
  }

  List<Product> get _shown {
    final q = _searchCtrl.text.trim().toLowerCase();
    var list = _activeProducts;
    if (q.isNotEmpty) {
      list = list.where((p) => p.name.toLowerCase().contains(q)).toList();
    }
    if (_cat != 'Semua') {
      list = list
          .where((p) =>
              (p.categoryName.isEmpty ? 'Lainnya' : p.categoryName) == _cat)
          .toList();
    }
    return list;
  }

  int _qtyInCart(int productId) =>
      _cart.where((l) => l.product.id == productId).fold(0, (s, l) => s + l.qty);

  double get _cartTotal => _cart.fold<double>(0, (s, l) => s + l.subtotal);

  int get _cartCount => _cart.fold(0, (s, l) => s + l.qty);

  Future<void> _submit(bool pay) async {
    final customer = _customerCtrl.text.trim();
    if (customer.isEmpty || _cart.isEmpty) {
      _snack('Nama pelanggan dan keranjang wajib diisi.', error: true);
      return;
    }
    setState(() => _busy = true);
    try {
      final order = await Api.createDirect(
        customerName: customer,
        pay: pay,
        items: _cart
            .map((l) => {
                  'product_id': l.product.id,
                  if (l.variantId != null) 'variant_id': l.variantId,
                  if (l.optionIds.isNotEmpty) 'option_ids': l.optionIds,
                  'quantity': l.qty,
                  'notes': l.notes,
                })
            .toList(),
      );
      setState(() {
        _cart.clear();
        _customerCtrl.clear();
      });
      if (mounted) Navigator.of(context).pop(); // close cart sheet
      _snack('${order.orderNumber} dibuat.');
      if (pay) await widget.onReceipt(order.id);
    } catch (e) {
      _snack(e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
    widget.onRefresh();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.loading) return const Center(child: CircularProgressIndicator());
    if (widget.error.isNotEmpty) {
      return ErrorView(message: widget.error, onRetry: widget.onRefresh);
    }
    final shown = _shown;
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: TextField(
            controller: _searchCtrl,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.search_rounded, size: 20),
              hintText: 'Cari produk...',
              suffixIcon: _searchCtrl.text.isEmpty
                  ? null
                  : IconButton(
                      icon: const Icon(Icons.close_rounded, size: 18),
                      onPressed: () => setState(_searchCtrl.clear),
                    ),
            ),
          ),
        ),
        SizedBox(
          height: 38,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: _categories.length,
            separatorBuilder: (_, _) => const SizedBox(width: 8),
            itemBuilder: (_, i) {
              final c = _categories[i];
              return _CategoryPill(
                label: c,
                selected: _cat == c,
                onTap: () => setState(() => _cat = c),
              );
            },
          ),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: shown.isEmpty
              ? const EmptyState(
                  icon: Icons.search_off_rounded,
                  title: 'Produk tidak ditemukan',
                  subtitle: 'Coba kata kunci atau kategori lain.',
                )
              : RefreshIndicator(
                  onRefresh: widget.onRefresh,
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      const padH = 32.0; // 16 kiri + 16 kanan
                      const gap = 8.0;
                      const bodyH = 67.0; // area nama/harga di bawah gambar
                      final cols = math.max(
                          1,
                          ((constraints.maxWidth - padH + gap) / (160 + gap))
                              .floor());
                      final itemW =
                          (constraints.maxWidth - padH - gap * (cols - 1)) / cols;
                      return GridView.builder(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: cols,
                          mainAxisSpacing: gap,
                          crossAxisSpacing: gap,
                          // gambar 16:9 + area nama/harga di bawahnya
                          mainAxisExtent: itemW * 9 / 16 + bodyH,
                        ),
                        itemCount: shown.length,
                        itemBuilder: (_, i) => _productCard(shown[i]),
                      );
                    },
                  ),
                ),
        ),
        if (_cart.isNotEmpty) _buildCartBar(),
      ],
    );
  }

  Widget _productCard(Product p) {
    final out = !p.isUnlimited && p.stock == 0;
    final qty = _qtyInCart(p.id);
    return Card(
      child: InkWell(
        onTap: out ? null : () => _openPicker(p),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Stack(
              children: [
                AspectRatio(
                  aspectRatio: 16 / 9,
                  child: p.imageUrl.isEmpty
                      ? Container(
                          color: AppColors.neutral,
                          child: const Icon(Icons.fastfood_rounded,
                              color: AppColors.hairline, size: 36),
                        )
                      : RemoteImage(url: Api.imageUrl(p.imageUrl)),
                ),
                // Gradient overlay di bawah gambar
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 32,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.transparent,
                          Colors.black.withValues(alpha: 0.08),
                        ],
                      ),
                    ),
                  ),
                ),
                if (out)
                  Positioned.fill(
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.6),
                        borderRadius: const BorderRadius.vertical(
                            top: Radius.circular(14)),
                      ),
                    ),
                  ),
                if (qty > 0)
                  Positioned(
                    top: 6,
                    left: 6,
                    child: BubbleTag('$qty',
                        background: AppColors.accent),
                  ),
                Positioned(
                  top: 6,
                  right: 6,
                  child: BubbleTag(
                    p.isUnlimited ? '∞' : '${p.stock}',
                    background: out ? AppColors.danger : (p.isUnlimited ? AppColors.accent : AppColors.dark),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 8, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    p.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: AppText.title.copyWith(fontSize: 12.5),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    rupiah(p.price),
                    style: AppText.price.copyWith(
                        fontSize: 13, color: AppColors.primaryDeep),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _openPicker(Product p) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _ProductSheet(
        product: p,
        onAdd: (variantId, optionIds, qty) =>
            _addLines(p, variantId, optionIds, qty),
      ),
    );
  }

  void _addLines(Product p, int? variantId, List<int> optionIds, int qty) {
    final line = CartLine(
      product: p,
      variantId: variantId,
      optionIds: optionIds,
      qty: qty,
    );
    setState(() {
      final i = _cart.indexWhere((l) => l.key == line.key);
      if (i >= 0) {
        var next = _cart[i].qty + qty;
        if (!p.isUnlimited && next > p.stock) next = p.stock;
        _cart[i].qty = next;
      } else {
        if (!p.isUnlimited && p.stock < 1) return;
        _cart.add(line);
      }
    });
  }

  // ---------- Cart ----------

  Widget _buildCartBar() {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: _showCart,
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [AppColors.primary, AppColors.primaryDeep],
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
            ),
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withValues(alpha: 0.35),
                blurRadius: 14,
                offset: const Offset(0, -4),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(
                  child: Text('$_cartCount',
                      style: AppText.bodyStrong
                          .copyWith(color: AppColors.primaryDeep)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Keranjang',
                        style: AppText.caption
                            .copyWith(color: Colors.white70)),
                    Text(rupiah(_cartTotal),
                        style: AppText.price.copyWith(color: Colors.white)),
                  ],
                ),
              ),
              FilledButton(
                onPressed: _showCart,
                style: FilledButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: AppColors.primaryDeep,
                  minimumSize: const Size(0, 40),
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                ),
                child: const Text('Lihat'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showCart() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) => StatefulBuilder(
        builder: (ctx, setSheet) => Padding(
          padding:
              EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
          child: DraggableScrollableSheet(
            expand: false,
            initialChildSize: 0.85,
            minChildSize: 0.5,
            maxChildSize: 0.95,
            builder: (_, scrollCtrl) => Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 12, 8),
                  child: Row(
                    children: [
                      const Text('Keranjang', style: AppText.title),
                      const SizedBox(width: 8),
                      Text('$_cartCount item', style: AppText.caption),
                      const Spacer(),
                      if (_cart.isNotEmpty)
                        TextButton(
                          onPressed: () {
                            setState(_cart.clear);
                            setSheet(() {});
                          },
                          child: const Text('Kosongkan'),
                        ),
                    ],
                  ),
                ),
                const Divider(height: 1),
                Expanded(
                  child: _cart.isEmpty
                      ? const EmptyState(
                          icon: Icons.shopping_cart_outlined,
                          title: 'Keranjang kosong',
                          subtitle: 'Pilih produk untuk mulai.',
                        )
                      : ListView.separated(
                          controller: scrollCtrl,
                          padding: const EdgeInsets.all(16),
                          itemCount: _cart.length,
                          separatorBuilder: (_, _) =>
                              const SizedBox(height: 10),
                          itemBuilder: (_, i) => _cartLineTile(i, setSheet),
                        ),
                ),
                Container(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                  decoration: const BoxDecoration(
                    border: Border(top: BorderSide(color: AppColors.line)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      TextField(
                        controller: _customerCtrl,
                        textCapitalization: TextCapitalization.words,
                        decoration: const InputDecoration(
                          hintText: 'Nama pelanggan',
                          prefixIcon:
                              Icon(Icons.person_outline_rounded, size: 20),
                        ),
                      ),
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          const Text('Total', style: AppText.caption),
                          const Spacer(),
                          Text(rupiah(_cartTotal), style: AppText.priceLg),
                        ],
                      ),
                      const SizedBox(height: 12),
                      FilledButton(
                        onPressed: _busy ? null : _showPayDialog,
                        child: _busy
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2, color: Colors.white),
                              )
                            : const Text('Buat Pesanan'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _cartLineTile(int i, StateSetter setSheet) {
    final l = _cart[i];
    return Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(l.product.name, style: AppText.bodyStrong),
                    if (l.description.isNotEmpty)
                      Text(l.description, style: AppText.caption),
                    if (l.notes.isNotEmpty)
                      Text('Catatan: ${l.notes}', style: AppText.caption),
                  ],
                ),
              ),
              IconButton(
                visualDensity: VisualDensity.compact,
                icon: const Icon(Icons.delete_outline_rounded,
                    size: 20, color: AppColors.muted),
                onPressed: () {
                  setState(() => _cart.removeAt(i));
                  setSheet(() {});
                },
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              QtyStepper(
                qty: l.qty,
                onMinus: () {
                  setState(() {
                    if (--l.qty < 1) _cart.removeAt(i);
                  });
                  setSheet(() {});
                },
                onPlus: () {
                  setState(() {
                    if (!l.product.isUnlimited && l.qty >= l.product.stock) {
                      return;
                    }
                    l.qty++;
                  });
                  setSheet(() {});
                },
              ),
              const Spacer(),
              Text(rupiah(l.subtotal),
                  style: AppText.price.copyWith(fontSize: 14)),
            ],
          ),
        ],
      ),
    );
  }

  void _showPayDialog() {
    final customer = _customerCtrl.text.trim();
    if (customer.isEmpty || _cart.isEmpty) {
      _snack('Nama pelanggan dan keranjang wajib diisi.', error: true);
      return;
    }
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Metode Pembayaran'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Panel(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Expanded(child: Text(customer, style: AppText.bodyStrong)),
                  Text(rupiah(_cartTotal), style: AppText.price),
                ],
              ),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _busy
                  ? null
                  : () {
                      Navigator.pop(ctx);
                      _submit(true);
                    },
              child: const Text('Tunai (langsung dibayar)'),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: _busy
                  ? null
                  : () {
                      Navigator.pop(ctx);
                      _submit(false);
                    },
              child: const Text('Bayar di tempat'),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProductSheet extends StatefulWidget {
  const _ProductSheet({required this.product, required this.onAdd});
  final Product product;
  final void Function(int? variantId, List<int> optionIds, int qty) onAdd;

  @override
  State<_ProductSheet> createState() => _ProductSheetState();
}

class _ProductSheetState extends State<_ProductSheet> {
  int _qty = 1;
  int? _variantId;
  final Set<int> _options = {};

  @override
  void initState() {
    super.initState();
    if (widget.product.variants.isNotEmpty) {
      _variantId = widget.product.variants.first.id;
    }
  }

  double get _unit {
    var price = widget.product.price;
    for (final v in widget.product.variants) {
      if (v.id == _variantId) price = v.price;
    }
    for (final o in widget.product.options) {
      if (_options.contains(o.id)) price += o.price;
    }
    return price;
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.product;
    final out = !p.isUnlimited && p.stock == 0;
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(p.name, style: AppText.appTitle),
            const SizedBox(height: 4),
            Text(rupiah(_unit),
                style: AppText.price.copyWith(color: AppColors.muted)),
            if (p.variants.isNotEmpty) ...[
              const SizedBox(height: 20),
              const Text('Pilih Varian', style: AppText.label),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final v in p.variants)
                    ChoiceChip(
                      label: Text(v.name),
                      selected: _variantId == v.id,
                      onSelected: (_) => setState(() => _variantId = v.id),
                    ),
                ],
              ),
            ],
            if (p.options.isNotEmpty) ...[
              const SizedBox(height: 20),
              const Text('Pilihan Tambahan', style: AppText.label),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final o in p.options)
                    FilterChip(
                      label: Text(o.price > 0
                          ? '${o.name} +${rupiah(o.price)}'
                          : o.name),
                      selected: _options.contains(o.id),
                      onSelected: (sel) => setState(() {
                        if (sel) {
                          _options.add(o.id);
                        } else {
                          _options.remove(o.id);
                        }
                      }),
                    ),
                ],
              ),
            ],
            const SizedBox(height: 24),
            Row(
              children: [
                QtyStepper(
                  qty: _qty,
                  onMinus: _qty <= 1
                      ? null
                      : () => setState(() => _qty--),
                  onPlus: !p.isUnlimited && _qty >= p.stock
                      ? null
                      : () => setState(() => _qty++),
                ),
                const Spacer(),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    const Text('Subtotal', style: AppText.caption),
                    Text(rupiah(_unit * _qty), style: AppText.priceLg),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: out
                  ? null
                  : () {
                      widget.onAdd(_variantId, [..._options]..sort(), _qty);
                      setState(() => _qty = 1);
                    },
              child: const Text('Tambah ke Pesanan'),
            ),
          ],
        ),
      ),
    );
  }
}

/// Pill kategori yang bisa dipilih (pengganti ChoiceChip bawaan).
class _CategoryPill extends StatelessWidget {
  const _CategoryPill({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        curve: Curves.easeOut,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadii.pill),
          border: Border.all(
            color: selected ? AppColors.primary : AppColors.line,
          ),
        ),
        child: Text(
          label,
          style: AppText.chip.copyWith(
            color: selected ? Colors.white : AppColors.ink,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
          ),
        ),
      ),
    );
  }
}
