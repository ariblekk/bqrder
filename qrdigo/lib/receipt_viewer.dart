import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'api.dart';
import 'formats.dart';
import 'models.dart';
import 'components/ui/index.dart';
import 'theme/app_colors.dart';
import 'theme/app_typography.dart';

class ReceiptViewer extends StatefulWidget {
  const ReceiptViewer({super.key, required this.orderId});

  final int orderId;

  @override
  State<ReceiptViewer> createState() => _ReceiptViewerState();
}

class _ReceiptViewerState extends State<ReceiptViewer> {
  bool _loading = true;
  String _error = '';
  Order? _order;
  Branch? _branch;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final data = await Api.receiptData(widget.orderId);
      setState(() {
        _order = Order.fromJson(data['order'] as Map<String, dynamic>);
        _branch = Branch.fromJson(data['branch'] as Map<String, dynamic>);
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _copyText() async {
    if (_order == null || _branch == null) return;
    try {
      final text = await Api.receiptText(widget.orderId);
      await Clipboard.setData(ClipboardData(text: text));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Struk disalin ke clipboard')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString()),
          backgroundColor: AppColors.danger,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Struk'),
        actions: [
          if (!_loading && _error.isEmpty)
            IconButton(
              icon: const Icon(Icons.copy_rounded),
              tooltip: 'Salin sebagai teks',
              onPressed: _copyText,
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error.isNotEmpty
              ? ErrorView(message: _error, onRetry: _load)
              : _buildReceipt(),
    );
  }

  Widget _buildReceipt() {
    final o = _order!;
    final b = _branch!;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Center(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 400),
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.line),
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withValues(alpha: 0.08),
                blurRadius: 20,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Header
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: AppColors.primarySoft,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Icon(
                  Icons.receipt_long_rounded,
                  color: AppColors.primaryDeep,
                  size: 28,
                ),
              ),
              const SizedBox(height: 16),
              Text('qrdigo', style: AppText.display.copyWith(fontSize: 20)),
              const SizedBox(height: 4),
              Text(b.name, style: AppText.appTitle.copyWith(fontSize: 16)),
              if (b.address.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(b.address,
                    style: AppText.caption, textAlign: TextAlign.center),
              ],
              if (b.phone.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text('Telp: ${b.phone}', style: AppText.caption),
              ],
              const SizedBox(height: 20),
              const Divider(),
              const SizedBox(height: 16),

              // Order info
              _row('No. Pesanan', o.orderNumber, bold: true),
              const SizedBox(height: 8),
              _row('Waktu',
                  '${formatDate(o.createdAt)} ${formatTime(o.createdAt)}'),
              if (o.customerName.isNotEmpty) ...[
                const SizedBox(height: 8),
                _row('Pelanggan', o.customerName),
              ],
              if (o.tableNumber.isNotEmpty) ...[
                const SizedBox(height: 8),
                _row('Meja', o.tableNumber),
              ],
              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 16),

              // Items
              for (final item in o.items) ...[
                _itemRow(item),
                const SizedBox(height: 12),
              ],

              const Divider(),
              const SizedBox(height: 16),

              // Total
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      AppColors.primarySoft,
                      AppColors.primarySoft.withValues(alpha: 0.6),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('TOTAL',
                        style: AppText.bodyStrong
                            .copyWith(color: AppColors.primaryDeep)),
                    Text(rupiah(o.totalAmount),
                        style: AppText.priceLg
                            .copyWith(color: AppColors.primaryDeep)),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Status
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  StatusChip(o.status),
                  const SizedBox(width: 8),
                  StatusChip(o.paymentStatus),
                ],
              ),
              const SizedBox(height: 24),

              // Footer
              const Divider(),
              const SizedBox(height: 12),
              Text('TERIMA KASIH',
                  style: AppText.bodyStrong
                      .copyWith(letterSpacing: 1, fontSize: 13)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _row(String label, String value, {bool bold = false}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 100,
          child: Text(label, style: AppText.caption),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            value,
            style: bold ? AppText.bodyStrong : AppText.body,
            textAlign: TextAlign.right,
          ),
        ),
      ],
    );
  }

  Widget _itemRow(OrderItem item) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                color: AppColors.primarySoft,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Center(
                child: Text(
                  '${item.quantity}',
                  style: AppText.smallTag.copyWith(
                    color: AppColors.primaryDeep,
                    fontSize: 11,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item.productName, style: AppText.bodyStrong),
                  Text(
                    '${item.quantity} x ${rupiah(item.price)}',
                    style: AppText.caption,
                  ),
                  if (item.notes.isNotEmpty)
                    Text('Catatan: ${item.notes}', style: AppText.caption),
                ],
              ),
            ),
            Text(rupiah(item.subtotal), style: AppText.bodyStrong),
          ],
        ),
      ],
    );
  }
}
