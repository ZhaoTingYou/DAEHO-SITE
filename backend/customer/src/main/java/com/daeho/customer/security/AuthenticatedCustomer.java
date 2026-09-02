package com.daeho.customer.security;

import java.time.Instant;

public record AuthenticatedCustomer(String subject, Instant issuedAt, boolean development) {}
