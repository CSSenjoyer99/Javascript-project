document.addEventListener('DOMContentLoaded', () => {
    // Initialize
    fetchProducts();
    setupCartFunctionality();
    setupUIInteractions();

    // ===== PRODUCT FUNCTIONS =====
    function fetchProducts() {
        fetch("https://restaurant.stepprojects.ge/api/Products/GetAll")
            .then(response => response.json())
            .then(products => renderProducts(products))
            .catch(err => console.error('Error loading products:', err));
    }

    function renderProducts(products) {
        const grid = document.querySelector(".gridsection");
        if (!grid) return;
        
        grid.innerHTML = "";
        products.forEach(product => {
            const foodCard = document.createElement("div");
            foodCard.className = "foodcard";
            foodCard.setAttribute("data-product-id", product.id);
            foodCard.setAttribute("data-price", product.price);

            const spiceIndicator = Array(product.spiciness)
                .fill('🌶️')
                .join('') || 'არ არის ცხარე';

            foodCard.innerHTML = `
                <div class="plusappear">
                    <img src="${product.image}" alt="${product.name}">
                    <i class="fa fa-plus plusanimation"></i>
                </div>
                <div class="foodtext1">
                    <p>${product.price}</p>
                    <img src="images/lari.png" alt="lari" />
                    <span class="spice-level">${spiceIndicator}</span>
                </div>
                <div class="foodtext2">
                    <p>${product.name}</p>
                </div>
            `;

            grid.appendChild(foodCard);
        });
    }

    // Add product to cart when clicked
    document.querySelector('.gridsection').addEventListener('click', async (e) => {
        const plus = e.target.closest('.plusappear');
        if (!plus) return;
        
        const foodCard = plus.closest('.foodcard');
        if (!foodCard) return;

        const productId = foodCard.getAttribute('data-product-id');
        const price = foodCard.getAttribute('data-price');
        
        const plusIcon = plus.querySelector('.plusanimation');
        plusIcon?.classList.add('added');
        
        try {
            await window.handleAddToCart(productId, price);
        } catch (error) {
            console.error('Error adding to cart:', error);
        }
        
        setTimeout(() => {
            plusIcon?.classList.remove('added');
        }, 1000);
    });

    // ===== CATEGORY FILTER FUNCTIONALITY =====
    document.querySelectorAll('.categorylist div').forEach(btn => {
        btn.addEventListener('click', async function() {
            document.querySelectorAll('.categorylist div').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.getAttribute('data-filter');
            
            try {
                let url = 'https://restaurant.stepprojects.ge/api/Products/GetFiltered';
                let params = new URLSearchParams();
                
                switch(filter) {
                    case 'vegan':
                        params.append('vegeterian', 'true');
                        break;
                    case 'soups':
                        params.append('categoryId', '1');
                        break;
                    case 'salads':
                        params.append('categoryId', '2');
                        break;
                    case 'cold':
                        params.append('categoryId', '3');
                        break;
                    case 'yvela':
                        // For "all" items, use the GetAll endpoint instead
                        url = 'https://restaurant.stepprojects.ge/api/Products/GetAll';
                        break;
                }

                const response = await fetch(url + (params.toString() ? `?${params}` : ''));
                if (!response.ok) throw new Error('Failed to fetch filtered products');
                
                const products = await response.json();
                renderProducts(products);
            } catch (error) {
                console.error('Error filtering products:', error);
            }
        });
    });

    // ===== CART FUNCTIONALITY =====
    function setupCartFunctionality() {
        // Make cart functions available globally
        window.handleAddToCart = async function(productId, price) {
            try {
                // Fix: Match the API schema exactly
                const response = await fetch('https://restaurant.stepprojects.ge/api/Baskets/AddToBasket', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        productId: parseInt(productId),
                        price: parseFloat(price),
                        quantity: 1
                    })
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('API Error:', errorText);
                    throw new Error('Failed to add item');
                }
                
                await refreshCart();
                return true;
            } catch (error) {
                console.error('Error adding item:', error);
                alert('დამატება ვერ მოხერხდა');
                return false;
            }
        }

        window.handleDeleteFromCart = async function(productId) {
            try {
                if (!productId || productId === 'undefined') {
                    console.error('Invalid productId:', productId);
                    return false;
                }
                
                const response = await fetch(`https://restaurant.stepprojects.ge/api/Baskets/DeleteProduct/${productId}`, {
                    method: 'DELETE'
                });
                
                if (response.status !== 204 && response.status !== 200) {
                    const errorText = await response.text();
                    console.error('Delete API Error:', errorText);
                    throw new Error('Failed to delete item');
                }
                
                await refreshCart();
                return true;
            } catch (error) {
                console.error('Error removing item:', error);
                alert('წაშლა ვერ მოხერხდა');
                return false;
            }
        }

        window.clearCart = async function() {
            try {
                // Get all current basket items
                const res = await fetch('https://restaurant.stepprojects.ge/api/Baskets/GetAll');
                if (!res.ok) throw new Error('Failed to fetch basket');
                const basketItems = await res.json();
                
                if (!basketItems.length) {
                    alert('კალათა უკვე ცარიელია');
                    return true;
                }
                
                // Delete each item individually since API doesn't have clear all
                for (const item of basketItems) {
                    const productId = item.productId || item.id || item.product?.id;
                    if (productId) {
                        await fetch(`https://restaurant.stepprojects.ge/api/Baskets/DeleteProduct/${productId}`, {
                            method: 'DELETE'
                        });
                    }
                }
                
                // Refresh the cart display
                await refreshCart();
                
                alert('კალათა გასუფთავდა');
                return true;
            } catch (error) {
                console.error('Error clearing cart:', error);
                alert('კალათის გასუფთავება ვერ მოხერხდა');
                return false;
            }
        }

        async function refreshCart() {
            try {
                const res = await fetch('https://restaurant.stepprojects.ge/api/Baskets/GetAll');
                if (!res.ok) throw new Error('Failed to fetch basket');
                const basketItems = await res.json();
                
                console.log('Basket items:', basketItems);
                
                const container = document.getElementById('cartItemsContainerDesktop');
                if (!container) return;
                
                container.innerHTML = '';
                
                // Don't add clear button here anymore - it will be in cartfooter
                
                if (!basketItems.length) {
                    container.insertAdjacentHTML('beforeend', '<p class="empty-cart-message">კალათა ცარიელია</p>');
                    updateCartTotal(0);
                    return;
                }
                
                let total = 0;
                
                basketItems.forEach(item => {
                    total += item.price * item.quantity;
                    
                    const productId = item.productId || item.id || item.product?.id;
                    
                    if (!productId) {
                        console.error('No productId found for item:', item);
                        return;
                    }
                    
                    const html = `
                        <div class="cartitem">
                            <div class="cartitemDetails">
                                <p><strong>${item.product?.name || 'Unnamed'}</strong></p>
                                <p>${item.price.toFixed(2)} ₾</p>
                            </div>
                            <div class="cartitemActions">
                                <button onclick="handleAddToCart(${productId}, ${item.price})" 
                                    class="actionBtn addBtn">
                                    <i class="fa fa-plus"></i>
                                </button>
                                <button onclick="handleDeleteFromCart(${productId})" 
                                    class="actionBtn deleteBtn">
                                    <i class="fa fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `;
                    container.insertAdjacentHTML('beforeend', html);
                });
                
                updateCartTotal(total);
            } catch (error) {
                console.error('Error refreshing cart:', error);
            }
        }

        function updateCartTotal(total) {
            const totalElement = document.querySelector('.totalamount');
            if (totalElement) {
                totalElement.textContent = `${total.toFixed(2)} ₾`;
            }
        }

        // Checkout button
        document.querySelector('.checkoutbtn')?.addEventListener('click', async function() {
            const totalElement = document.querySelector('.totalamount');
            if (!totalElement) return;
            
            const total = parseFloat(totalElement.textContent);
            
            if (total <= 0) {
                alert('კალათა ცარიელია');
                return;
            }

            try {
                alert('გადახდაზე გადასვლა: ' + total.toFixed(2) + ' ₾');
            } catch (error) {
                console.error('Checkout error:', error);
                alert('გადახდის შეცდომა');
            }
        });

        // Add a clear cart button to the existing cartfooter
        const cartFooter = document.querySelector('.cartfooter');
        if (cartFooter && !cartFooter.querySelector('.clearcartbtn')) {
            const clearCartBtn = document.createElement('button');
            clearCartBtn.className = 'clearcartbtn';
            clearCartBtn.innerHTML = '<i class="fa fa-trash"></i> გასუფთავება';
            clearCartBtn.onclick = clearCart;
            
            // Insert at the beginning of cartfooter
            cartFooter.insertBefore(clearCartBtn, cartFooter.firstChild);
        }

        // Initialize cart
        refreshCart();
    }

    // ===== UI INTERACTIONS =====
    function setupUIInteractions() {
        const cartSlider = document.getElementById('cartSlider');
        const openCartBtn = document.getElementById('openCartBtn');
        const closeCartBtn = document.getElementById('closeCart');
        const backdrop = document.getElementById('globalBackdrop');

        function openCart() {
            cartSlider.classList.add('active');
            backdrop.style.display = 'block';
            document.body.classList.add('dimmed');
        }

        function closeCart() {
            cartSlider.classList.remove('active');
            backdrop.style.display = 'none';
            document.body.classList.remove('dimmed');
        }

        if (openCartBtn) openCartBtn.addEventListener('click', openCart);
        if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
        if (backdrop) backdrop.addEventListener('click', closeCart);

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && cartSlider.classList.contains('active')) {
                closeCart();
            }
        });
    }

    // ===== SEARCH FUNCTIONALITY =====
    const searchInput = document.querySelector('.searchbarssr input');

    if (searchInput) {
        let searchTimeout;
        
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.trim();
            
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            
            searchTimeout = setTimeout(() => {
                if (searchTerm.length === 0) {
                    fetchProducts(); // Use your existing function
                } else if (searchTerm.length >= 2) {
                    searchProducts(searchTerm);
                }
            }, 300);
        });
    }

    async function searchProducts(searchTerm) {
        try {
            const response = await fetch('https://restaurant.stepprojects.ge/api/Products/GetAll');
            if (!response.ok) throw new Error('Failed to fetch products');
            
            const allProducts = await response.json();
            
            const filteredProducts = allProducts.filter(product => 
                product.name && 
                product.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            
            renderProducts(filteredProducts); // Use your existing function
            
            if (filteredProducts.length === 0) {
                const grid = document.querySelector(".gridsection");
                if (grid) {
                    grid.innerHTML = `
                        <div style="text-align: center; padding: 40px;">
                            <p>ვერ მოიძებნა "${searchTerm}" ძიების შედეგები</p>
                            <button onclick="clearSearch()" style="background: #A2823C; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                                ყველას ნახვა
                            </button>
                        </div>
                    `;
                }
            }
            
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    window.clearSearch = function() {
        const searchInput = document.querySelector('.searchbarssr input');
        if (searchInput) {
            searchInput.value = '';
        }
        fetchProducts(); // Use your existing function
    }
});

document.getElementById('openCart').addEventListener('click', function() {
    openMobileCart();
});

function openMobileCart() {
    const mobileCart = document.querySelector('.animationforcart');
    
    if (mobileCart) {
        mobileCart.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeMobileCart() {
    const mobileCart = document.querySelector('.animationforcart');
    
    if (mobileCart) {
        mobileCart.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

// Close mobile cart with close button
document.addEventListener('click', function(e) {
    if (e.target.matches('#closeCartMobile')) {
        closeMobileCart();
    }
});