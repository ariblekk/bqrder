class User {
  final int id;
  final int branchId;
  final String name;
  final String email;
  final String role;

  User({
    required this.id,
    required this.branchId,
    required this.name,
    required this.email,
    required this.role,
  });

  factory User.fromJson(Map<String, dynamic> j) => User(
        id: j['id'] as int,
        branchId: j['branch_id'] as int? ?? 0,
        name: j['name'] as String? ?? '',
        email: j['email'] as String? ?? '',
        role: j['role'] as String? ?? '',
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'branch_id': branchId,
        'name': name,
        'email': email,
        'role': role,
      };
}

class AuthData {
  final String accessToken;
  final String refreshToken;
  final User user;

  AuthData({
    required this.accessToken,
    required this.refreshToken,
    required this.user,
  });

  factory AuthData.fromJson(Map<String, dynamic> j) => AuthData(
        accessToken: j['access_token'] as String,
        refreshToken: j['refresh_token'] as String? ?? '',
        user: User.fromJson(j['user'] as Map<String, dynamic>),
      );

  Map<String, dynamic> toJson() => {
        'access_token': accessToken,
        'refresh_token': refreshToken,
        'user': user.toJson(),
      };
}

class Branch {
  final int id;
  final String name;
  final String address;
  final String phone;

  Branch({
    required this.id,
    required this.name,
    this.address = '',
    this.phone = '',
  });

  factory Branch.fromJson(Map<String, dynamic> j) => Branch(
        id: j['id'] as int,
        name: j['name'] as String? ?? '',
        address: j['address'] as String? ?? '',
        phone: j['phone'] as String? ?? '',
      );
}

class ProductVariant {
  final int id;
  final String name;
  final double price;

  ProductVariant({required this.id, required this.name, required this.price});

  factory ProductVariant.fromJson(Map<String, dynamic> j) => ProductVariant(
        id: j['id'] as int,
        name: j['name'] as String? ?? '',
        price: (j['price'] as num?)?.toDouble() ?? 0,
      );
}

class ProductOption {
  final int id;
  final String name;
  final double price;

  ProductOption({required this.id, required this.name, required this.price});

  factory ProductOption.fromJson(Map<String, dynamic> j) => ProductOption(
        id: j['id'] as int,
        name: j['name'] as String? ?? '',
        price: (j['price'] as num?)?.toDouble() ?? 0,
      );
}

class Product {
  final int id;
  final String name;
  final String description;
  final double price;
  final int stock;
  final bool isUnlimited;
  final String imageUrl;
  final bool isActive;
  final String categoryName;
  final List<ProductVariant> variants;
  final List<ProductOption> options;

  Product({
    required this.id,
    required this.name,
    this.description = '',
    required this.price,
    required this.stock,
    required this.isUnlimited,
    this.imageUrl = '',
    this.isActive = true,
    this.categoryName = '',
    this.variants = const [],
    this.options = const [],
  });

  factory Product.fromJson(Map<String, dynamic> j) => Product(
        id: j['id'] as int,
        name: j['name'] as String? ?? '',
        description: j['description'] as String? ?? '',
        price: (j['price'] as num?)?.toDouble() ?? 0,
        stock: j['stock'] as int? ?? 0,
        isUnlimited: j['is_unlimited'] as bool? ?? false,
        imageUrl: j['image_url'] as String? ?? '',
        isActive: j['is_active'] as bool? ?? true,
        categoryName: j['category_name'] as String? ?? '',
        variants: ((j['variants'] as List?) ?? [])
            .map((e) => ProductVariant.fromJson(e as Map<String, dynamic>))
            .toList(),
        options: ((j['options'] as List?) ?? [])
            .map((e) => ProductOption.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class OrderItem {
  final int productId;
  final String productName;
  final int quantity;
  final double price;
  final double subtotal;
  final String notes;

  OrderItem({
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.price,
    required this.subtotal,
    this.notes = '',
  });

  factory OrderItem.fromJson(Map<String, dynamic> j) => OrderItem(
        productId: j['product_id'] as int? ?? 0,
        productName: j['product_name'] as String? ?? '',
        quantity: j['quantity'] as int? ?? 0,
        price: (j['price'] as num?)?.toDouble() ?? 0,
        subtotal: (j['subtotal'] as num?)?.toDouble() ?? 0,
        notes: j['notes'] as String? ?? '',
      );
}

class Order {
  final int id;
  final String orderNumber;
  final String customerName;
  final String tableNumber;
  final double totalAmount;
  final String status;
  final String paymentStatus;
  final String? paymentMethod;
  final DateTime? createdAt;
  final List<OrderItem> items;

  Order({
    required this.id,
    required this.orderNumber,
    this.customerName = '',
    this.tableNumber = '',
    required this.totalAmount,
    required this.status,
    required this.paymentStatus,
    this.paymentMethod,
    this.createdAt,
    this.items = const [],
  });

  factory Order.fromJson(Map<String, dynamic> j) => Order(
        id: j['id'] as int,
        orderNumber: j['order_number'] as String? ?? '',
        customerName: j['customer_name'] as String? ?? '',
        tableNumber: j['table_number'] as String? ?? '',
        totalAmount: (j['total_amount'] as num?)?.toDouble() ?? 0,
        status: j['status'] as String? ?? '',
        paymentStatus: j['payment_status'] as String? ?? '',
        paymentMethod: j['payment_method'] as String?,
        createdAt: j['created_at'] != null
            ? DateTime.tryParse(j['created_at'] as String)
            : null,
        items: ((j['items'] as List?) ?? [])
            .map((e) => OrderItem.fromJson(e as Map<String, dynamic>))
            .toList(),
      );

  bool get needsPay => paymentStatus == 'unpaid' && status != 'cancelled';
  bool get canProses => paymentStatus == 'paid' && status == 'pending';
  bool get canFinish => paymentStatus == 'paid' && status == 'processing';
}