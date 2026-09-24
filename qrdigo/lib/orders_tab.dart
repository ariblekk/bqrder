import 'package:flutter/material.dart';

import 'api.dart';
import 'formats.dart';
import 'models.dart';
import 'components/ui/index.dart';
import 'theme/app_colors.dart';
import 'theme/app_typography.dart';
import 'theme/app_shadows.dart';
import 'theme/app_animations.dart';

class OrdersTab extends StatefulWidget {
  const OrdersTab({
    super.key,
    required this.orders,
    required this.loading,
    required this.error,
    required this.onRefresh,
    required this.onReceipt,
  });

  final List<Order> orders;
  final bool loading;
  final String error;
  final Future<void> Function() onRefresh;
  final Future<void> Function(int id) onReceipt;

  @override
  State<OrdersTab> createState() => _OrdersTabState();
}

class _OrdersTabState extends State<OrdersTab> {
  bool _busy = false;

  void _snack(String msg, {bool error = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: error ? AppColors.danger : null,
    ));
  }

  Future<void> _act(Future<void> Function() fn, String doneMsg) async {
    setState(() => _busy = true);
    try {
      await fn();
      _snack(doneMsg);
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
    if (widget.orders.isEmpty) {
      return const EmptyState(
        icon: Icons.receipt_long_outlined,
        title: 'Belum ada pesanan',
        subtitle: 'Pesanan hari ini akan muncul di sini.',
      );
    }
    return RefreshIndicator(
      onRefresh: widget.onRefresh,
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        itemCount: widget.orders.length,
        separatorBuilder: (_, _) => const SizedBox(height: 6),
        itemBuilder: (_, i) => _orderCard(widget.orders[i]),
      ),
    );
  }

  Widget _orderCard(Order o) {
    final paid = o.paymentStatus == 'paid';
    final done = o.status == 'completed' && paid;
    final attention = o.needsPay || o.canProses;
    final sc = statusColor(o.status);
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 1.0, end: 1.0),
      duration: AppAnimations.fast,
      curve: AppAnimations.easeOut,
      builder: (context, scale, child) => Transform.scale(
        scale: scale,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: () => _openDetail(o),
            onTapDown: (_) => setState(() {}),
            onTapUp: (_) => setState(() {}),
            onTapCancel: () => setState(() {}),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: attention ? sc.withValues(alpha: 0.5) : AppColors.line,
                  width: attention ? 1.5 : 1,
                ),
                boxShadow: attention ? AppShadows.attention(sc) : AppShadows.card(),
              ),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: sc.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(13),
                    ),
                    child: Icon(
                      attention
                          ? Icons.notifications_active_rounded
                          : done
                              ? Icons.check_circle_rounded
                              : Icons.receipt_long_rounded,
                      color: sc,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                o.customerName.isEmpty
                                    ? o.orderNumber
                                    : o.customerName,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: AppText.bodyStrong.copyWith(
                                  fontSize: 14.5,
                                  fontWeight: attention
                                      ? FontWeight.w800
                                      : FontWeight.w700,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              timeAgo(o.createdAt),
                              style: AppText.caption.copyWith(
                                color:
                                    attention ? AppColors.primary : AppColors.muted,
                                fontWeight: attention ? FontWeight.w600 : FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            StatusChip(o.status),
                            const SizedBox(width: 6),
                            StatusChip(o.paymentStatus),
                            const Spacer(),
                            Text(
                              rupiah(o.totalAmount),
                              style: AppText.price.copyWith(fontSize: 13.5),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _openDetail(Order o) {
    final sc = statusColor(o.status);
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      transitionAnimationController: AnimationController(
        vsync: Navigator.of(context),
        duration: AppAnimations.medium,
      )..forward(),
      builder: (sheetContext) => StatefulBuilder(
        builder: (ctx, setSheet) => SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header clean
              Container(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: sc.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(13),
                          ),
                          child: Icon(Icons.receipt_long_rounded,
                              color: sc, size: 22),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(o.orderNumber, style: AppText.appTitle),
                              if (o.customerName.isNotEmpty)
                                Text(o.customerName, style: AppText.caption),
                            ],
                          ),
                        ),
                        StatusChip(o.status),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Icon(Icons.schedule_rounded,
                            size: 14, color: AppColors.muted),
                        const SizedBox(width: 4),
                        Text(timeAgo(o.createdAt), style: AppText.caption),
                        const SizedBox(width: 12),
                        StatusChip(o.paymentStatus),
                      ],
                    ),
                  ],
                ),
              ),
              // Divider subtle
              Container(
                height: 1,
                margin: const EdgeInsets.symmetric(horizontal: 20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Colors.transparent,
                      AppColors.line,
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
              // Body
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Panel(
                      child: Column(
                        children: [
                          for (final it in o.items)
                            Padding(
                              padding:
                                  const EdgeInsets.symmetric(vertical: 6),
                              child: Row(
                                children: [
                                  Container(
                                    width: 28,
                                    height: 28,
                                    decoration: BoxDecoration(
                                      color: AppColors.primarySoft,
                                      borderRadius:
                                          BorderRadius.circular(8),
                                    ),
                                    child: Center(
                                      child: Text(
                                        '${it.quantity}',
                                        style: AppText.smallTag.copyWith(
                                          color: AppColors.primaryDeep,
                                          fontSize: 11.5,
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(it.productName,
                                            style: AppText.body),
                                        if (it.notes.isNotEmpty)
                                          Text('(${it.notes})',
                                              style: AppText.caption),
                                      ],
                                    ),
                                  ),
                                  Text(rupiah(it.subtotal),
                                      style: AppText.bodyStrong),
                                ],
                              ),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            AppColors.primarySoft,
                            AppColors.primarySoft.withValues(alpha: 0.7),
                          ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Row(
                        children: [
                          Text('Total',
                              style: AppText.bodyStrong
                                  .copyWith(color: AppColors.primaryDeep)),
                          const Spacer(),
                          Text(rupiah(o.totalAmount),
                              style: AppText.priceLg
                                  .copyWith(color: AppColors.primaryDeep)),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        if (o.canProses)
                          FilledButton.icon(
                            onPressed: _busy
                                ? null
                                : () => _actAndClose(
                                    sheetContext,
                                    () => Api.updateStatus(
                                        o.id, 'processing'),
                                    'Status diperbarui.'),
                            icon: const Icon(Icons.play_arrow_rounded,
                                size: 18),
                            label: const Text('Proses'),
                          ),
                        if (o.canFinish)
                          FilledButton.icon(
                            onPressed: _busy
                                ? null
                                : () => _actAndClose(
                                    sheetContext,
                                    () => Api.updateStatus(
                                        o.id, 'completed'),
                                    'Status diperbarui.'),
                            icon: const Icon(Icons.check_rounded,
                                size: 18),
                            label: const Text('Selesai'),
                          ),
                        if (o.needsPay) ...[
                          FilledButton.icon(
                            onPressed: _busy
                                ? null
                                : () => _actAndClose(
                                    sheetContext,
                                    () => Api.pay(o.id),
                                    'Berhasil dibayar.'),
                            style: FilledButton.styleFrom(
                              backgroundColor: AppColors.accent,
                            ),
                            icon: const Icon(Icons.payments_rounded,
                                size: 18),
                            label: const Text('Bayar Tunai'),
                          ),
                          OutlinedButton.icon(
                            onPressed: _busy
                                ? null
                                : () => _actAndClose(
                                    sheetContext,
                                    () => Api.updateStatus(
                                        o.id, 'cancelled'),
                                    'Pesanan dibatalkan.'),
                            icon: const Icon(Icons.close_rounded,
                                size: 18),
                            label: const Text('Batal'),
                          ),
                        ],
                        OutlinedButton.icon(
                          onPressed: () => widget.onReceipt(o.id),
                          icon:
                              const Icon(Icons.receipt_rounded, size: 18),
                          label: const Text('Struk'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _actAndClose(
      BuildContext sheetContext, Future<void> Function() fn, String msg) async {
    await _act(fn, msg);
    if (sheetContext.mounted) Navigator.pop(sheetContext);
  }
}
