import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'models.dart';

const _kBase = 'qrdigo_base';
const _kAuth = 'qrdigo_auth';

class ApiError implements Exception {
  final int status;
  final String message;
  ApiError(this.status, this.message);
  @override
  String toString() => message;
}

class Api {
  static String baseUrl = '';
  static AuthData? auth;
  static void Function()? onOrderEvent;

  static Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    baseUrl = prefs.getString(_kBase) ?? '';
    final raw = prefs.getString(_kAuth);
    if (raw != null) {
      try {
        auth = AuthData.fromJson(jsonDecode(raw) as Map<String, dynamic>);
      } catch (_) {
        auth = null;
      }
    }
  }

  static bool get loggedIn => auth != null && baseUrl.isNotEmpty;

  static Future<void> save(String base, AuthData a) async {
    baseUrl = _normalizeBase(base);
    auth = a;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kBase, baseUrl);
    await prefs.setString(_kAuth, jsonEncode(a.toJson()));
  }

  static Future<void> logout() async {
    baseUrl = '';
    auth = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kBase);
    await prefs.remove(_kAuth);
  }

  static String _normalizeBase(String b) {
    var s = b.trim();
    if (s.endsWith('/')) s = s.substring(0, s.length - 1);
    return s;
  }

  static String _url(String path) => '$baseUrl/api/v1$path';

  static String imageUrl(String path) {
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return '$baseUrl$path';
  }

  static Future<Map<String, dynamic>> _envelope(http.Response r) async {
    final body = jsonDecode(r.body);
    if (r.statusCode >= 200 && r.statusCode < 300) {
      return body as Map<String, dynamic>;
    }
    final msg = (body is Map && body['message'] != null)
        ? body['message'] as String
        : 'HTTP ${r.statusCode}';
    throw ApiError(r.statusCode, msg);
  }

  static Future<http.Response> _req(
    String method,
    Uri uri,
    Map<String, String> headers,
    Map<String, dynamic>? body,
  ) {
    final enc = body != null ? jsonEncode(body) : null;
    switch (method) {
      case 'GET':
        return http.get(uri, headers: headers);
      case 'POST':
        return enc == null
            ? http.post(uri, headers: headers)
            : http.post(uri, headers: headers, body: enc);
      case 'DELETE':
        return http.delete(uri, headers: headers, body: enc);
      default:
        return http.put(uri, headers: headers, body: enc ?? '');
    }
  }

  static Future<Map<String, dynamic>> _unauth(
    String method,
    String path,
    Map<String, dynamic>? body,
  ) async {
    final uri = Uri.parse(_url(path));
    final r = await _req(method, uri,
        {'Content-Type': 'application/json'}, body);
    return _envelope(r);
  }

  static Future<Map<String, dynamic>> _send(
    String method,
    String path,
    Map<String, dynamic>? body,
  ) async {
    if (auth == null) throw ApiError(401, 'Not logged in');
    final uri = Uri.parse(_url(path));
    final r = await _req(method, uri, {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ${auth!.accessToken}',
    }, body);
    if (r.statusCode == 401) {
      if (await _refresh()) return _send(method, path, body);
      throw ApiError(401, 'Sesi berakhir, silakan login ulang');
    }
    return _envelope(r);
  }

  static Future<bool> _refresh() async {
    if (auth == null || auth!.refreshToken.isEmpty) return false;
    try {
      final res = await _unauth('POST', '/auth/refresh', {
        'refresh_token': auth!.refreshToken,
      });
      final a = AuthData.fromJson(res['data'] as Map<String, dynamic>);
      await save(baseUrl, a);
      return true;
    } catch (_) {
      return false;
    }
  }

  static Future<AuthData> login(String email, String password) async {
    final base = baseUrl;
    final res = await _unauth('POST', '/auth/login', {
      'email': email,
      'password': password,
    });
    final a = AuthData.fromJson(res['data'] as Map<String, dynamic>);
    await save(base, a);
    return a;
  }

  static Future<Branch> branch() async {
    final res = await _send('GET', '/pos/branch', null);
    return Branch.fromJson(res['data'] as Map<String, dynamic>);
  }

  static Future<List<Product>> products() async {
    final res = await _send('GET', '/pos/products?limit=100', null);
    return (res['data'] as List)
        .map((e) => Product.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  static Future<List<Order>> orders() async {
    final res = await _send('GET', '/pos/orders', null);
    return (res['data'] as List)
        .map((e) => Order.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  static Future<Order> createDirect({
    required String customerName,
    required List<Map<String, dynamic>> items,
    required bool pay,
  }) async {
    final res = await _send('POST', '/pos/orders/direct', {
      'customer_name': customerName,
      'items': items,
      'pay': pay,
    });
    return Order.fromJson(res['data'] as Map<String, dynamic>);
  }

  static Future<void> updateStatus(int id, String status) async {
    await _send('PUT', '/pos/orders/$id/status', {'status': status});
  }

  static Future<void> pay(int id, {double? amountPaid}) async {
    final body = <String, dynamic>{
      'payment_method': 'cash',
      'amount_paid': ?amountPaid,
    };
    await _send('POST', '/pos/orders/$id/pay', body);
  }

  static Future<Map<String, dynamic>> receiptData(int id) async {
    final res = await _send('GET', '/pos/orders/$id/receipt', null);
    return res['data'] as Map<String, dynamic>;
  }

  static Future<String> receiptText(int id) async {
    final res = await _send('GET', '/pos/orders/$id/receipt?format=text', null);
    final data = res['data'] as Map<String, dynamic>;
    return data['receipt'] as String? ?? '';
  }

  static Future<void> registerDevice(String token, String platform) async {
    await _send('POST', '/pos/devices', {'token': token, 'platform': platform});
  }

  static Future<void> unregisterDevice(String token) async {
    await _send('DELETE', '/pos/devices', {'token': token});
  }
}