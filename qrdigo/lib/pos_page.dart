import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'api.dart';
import 'login_page.dart';
import 'models.dart';
import 'notifications.dart';
import 'orders_tab.dart';
import 'products_tab.dart';
import 'receipt_viewer.dart';
import 'theme/app_colors.dart';
import 'theme/app_theme.dart';
import 'theme/app_typography.dart';

class PosPage extends StatefulWidget {
  const PosPage({super.key});

  @override
  State<PosPage> createState() => _PosPageState();
}

class _PosPageState extends State<PosPage> {
  var _tab = 0;
  bool _loading = true;
  String _error = '';
  Branch? _branch;
  List<Product> _products = [];
  List<Order> _orders = [];

  @override
  void initState() {
    super.initState();
    Api.onOrderEvent = _refresh;
    _refresh();
  }

  void _snack(String msg, {bool error = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: error ? AppColors.danger : null,
    ));
  }

  Widget _headerButton(IconData icon, VoidCallback? onTap, String tip) {
    return Padding(
      padding: const EdgeInsets.only(left: 6),
      child: IconButton(
        onPressed: onTap,
        tooltip: tip,
        icon: Icon(icon, size: 19),
        style: IconButton.styleFrom(
          foregroundColor: Colors.white,
          backgroundColor: Colors.white.withValues(alpha: 0.2),
          disabledForegroundColor: Colors.white54,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(11),
          ),
        ),
      ),
    );
  }

  Future<void> _refresh() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final branch = await Api.branch();
      final products = await Api.products();
      final orders = await Api.orders();
      if (!mounted) return;
      setState(() {
        _branch = branch;
        _products = products;
        _orders = orders;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.toString();
      });
    }
  }

  int get _needsAttention => _orders
      .where((o) =>
          (o.paymentStatus == 'unpaid' && o.status != 'cancelled') ||
          (o.paymentStatus == 'paid' && o.status == 'pending'))
      .length;

  void _logout() async {
    await Notif.unregisterToken();
    await Api.logout();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginPage(baseUrl: '')),
      (_) => false,
    );
  }

  Future<void> _showReceipt(int id) async {
    if (!mounted) return;
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => ReceiptViewer(orderId: id)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 66,
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        systemOverlayStyle: SystemUiOverlayStyle.light,
        titleSpacing: 16,
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [AppColors.primary, AppColors.primaryDeep],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.vertical(bottom: Radius.circular(22)),
          ),
        ),
        title: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.22),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.storefront_rounded,
                  color: Colors.white, size: 20),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    _branch?.name ?? 'qrdigo',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.2,
                    ),
                  ),
                  Text(
                    Api.auth?.user.name.isNotEmpty == true
                        ? 'Kasir · ${Api.auth!.user.name}'
                        : 'Point of Sale',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w500,
                      color: Colors.white.withValues(alpha: 0.85),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          _headerButton(Icons.refresh_rounded, _loading ? null : _refresh,
              'Muat ulang'),
          _headerButton(Icons.logout_rounded, _logout, 'Keluar'),
          const SizedBox(width: 10),
        ],
      ),
      body: IndexedStack(
        index: _tab,
        children: [
          ProductsTab(
            products: _products,
            loading: _loading,
            error: _error,
            onRefresh: _refresh,
            onReceipt: _showReceipt,
          ),
          OrdersTab(
            orders: _orders,
            loading: _loading,
            error: _error,
            onRefresh: _refresh,
            onReceipt: _showReceipt,
          ),
        ],
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppColors.surface,
          border: Border(top: BorderSide(color: AppColors.line)),
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
            child: Row(
              children: [
                Expanded(
                  child: _NavPill(
                    icon: Icons.grid_view_rounded,
                    label: 'Produk',
                    selected: _tab == 0,
                    onTap: () => setState(() => _tab = 0),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _NavPill(
                    icon: Icons.receipt_long_rounded,
                    label: 'Pesanan',
                    selected: _tab == 1,
                    badge: _needsAttention,
                    onTap: () => setState(() => _tab = 1),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Tab bottom-nav custom dengan highlight pill.
class _NavPill extends StatelessWidget {
  const _NavPill({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
    this.badge = 0,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final int badge;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        curve: Curves.easeOut,
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : AppColors.neutral,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon,
                size: 19,
                color: selected ? Colors.white : AppColors.muted),
            const SizedBox(width: 8),
            Text(
              label,
              style: AppText.controlLabel.copyWith(
                fontSize: 12,
                color: selected ? Colors.white : AppColors.muted,
              ),
            ),
            if (badge > 0) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                decoration: BoxDecoration(
                  color: selected ? Colors.white : AppColors.danger,
                  borderRadius: BorderRadius.circular(AppRadii.pill),
                ),
                child: Text(
                  '$badge',
                  style: AppText.smallTag.copyWith(
                    color: selected ? AppColors.primaryDeep : Colors.white,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
