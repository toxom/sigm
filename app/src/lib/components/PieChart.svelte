<script lang="ts">
    import { onMount } from 'svelte';
    import { getTokenLogo, generateTokenSvg } from '$lib/utils/tokens';

    export let size = 300;
    export let bgColor = '#3a76d8';
    export let fgColor = 'white';
    export let tokens = []; // This will come from your parent component now

    let selectedCurrency = 'usd';
    let currencySymbols: {[key: string]: string} = {
        'usd': '$',
        'eur': '€',
        'btc': '₿',
        'eth': 'Ξ'
    };
    
    // Data structure for pie segments
    interface PieSegment {
        label: string;
        value: number;
        color: string;
        symbol: string;
        originalValue: number;
    }

    const tokenColors = [
        '#FF6384', '#36A2EB', '#FFCE56', 
        '#4BC0C0', '#9966FF', '#FF9F40',
        '#8AC926', '#1982C4', '#6A4C93',
        '#F94144', '#F3722C', '#577590'
    ];
    
    let totalBalance = 0; 
    let portfolioGrowth = 0;  // This should also come from parent component
    let pieData: PieSegment[] = [];
    let isLoading = true;
    let hoveredSegment: number | null = null;
    let error = '';
    let segments: Array<PieSegment & {
        path: string;
        startAngle: number;
        endAngle: number;
        midX: number;
        midY: number;
    }> = [];

    $: viewBox = `0 0 ${size} ${size}`;
    $: radius = size / 2;

    // Create pie data from tokens
    function createPieData() {
        // Reset pieData
        pieData = [];
        
        if (!tokens || tokens.length === 0) {
            return;
        }
        
        // Create segments from tokens
        pieData = tokens.map((token, index) => {
            return {
                label: token.name || token.symbol,
                value: token.value,
                originalValue: token.value,
                color: tokenColors[index % tokenColors.length],
                symbol: token.symbol
            };
        }).filter(segment => segment.value > 0);
        
        // Calculate segments
        calculateSegments();
    }

    // Calculate segments for the pie chart
    function calculateSegments() {
        if (pieData.length === 0) {
            segments = [];
            return;
        }
        
        // Calculate total for percentage calculations
        const total = pieData.reduce((sum, segment) => sum + segment.value, 0);
        totalBalance = total; // Update total balance
        
        if (total === 0) {
            segments = [];
            return;
        }
        
        segments = pieData.map((segment, index) => {
            // Calculate angles for this segment
            const startValue = pieData.slice(0, index).reduce((sum, segment) => sum + segment.value, 0);
            const startAngle = (startValue / total) * (2 * Math.PI) - Math.PI / 2;
            const angle = (segment.value / total) * (2 * Math.PI);
            const endAngle = startAngle + angle;
            
            // Calculate path coordinates
            const x1 = radius + radius * Math.cos(startAngle);
            const y1 = radius + radius * Math.sin(startAngle);
            const x2 = radius + radius * Math.cos(endAngle);
            const y2 = radius + radius * Math.sin(endAngle);

            const largeArcFlag = angle > Math.PI ? 1 : 0;

            // Create SVG path
            const d = `
                M ${radius} ${radius}
                L ${x1} ${y1}
                A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
                Z
            `;

            // Calculate midpoint for labels
            const midAngle = startAngle + (endAngle - startAngle) / 2;
            const labelRadius = radius * 0.7;
            const midX = radius + labelRadius * Math.cos(midAngle);
            const midY = radius + labelRadius * Math.sin(midAngle);

            return {
                ...segment,
                path: d,
                startAngle,
                endAngle,
                midX,
                midY
            };
        });
    }

    // Conversion function for different currencies (simplified)
    function convertAmount(originalValue: number, fromSymbol: string, toCurrency: string): number {
        // Find the token with this symbol to get its price
        const token = tokens.find(t => t.symbol.toLowerCase() === fromSymbol.toLowerCase());
        const price = token ? token.price : 0;
        
        // If converting to USD, simply return the original value (already in USD)
        if (toCurrency === 'usd') return originalValue;
        
        // For other currencies, we need to convert from USD
        if (toCurrency === 'btc' && price) {
            // Find BTC price from tokens
            const btcToken = tokens.find(t => t.symbol.toLowerCase() === 'btc');
            const btcPrice = btcToken ? btcToken.price : 40000; // Default if not found
            return originalValue / btcPrice;
        }
        
        if (toCurrency === 'eth' && price) {
            // Find ETH price from tokens
            const ethToken = tokens.find(t => t.symbol.toLowerCase() === 'eth');
            const ethPrice = ethToken ? ethToken.price : 2200; // Default if not found
            return originalValue / ethPrice;
        }
        
        if (toCurrency === 'eur' && price) {
            // Basic USD to EUR conversion
            return originalValue * 0.93; // Approximate exchange rate
        }
        
        // Default, return original value
        return originalValue;
    }

    // Update values when currency changes
    function updateCurrencyValues() {
        // Only proceed if we have data
        if (!pieData.length) return;
        
        // If selected currency is USD, use original values
        if (selectedCurrency === 'usd') {
            pieData = pieData.map(segment => ({
                ...segment,
                value: segment.originalValue
            }));
        } else {
            // Convert each segment value to the selected currency
            pieData = pieData.map(segment => {
                // Convert from USD to the target currency
                const convertedValue = convertAmount(
                    segment.originalValue, 
                    segment.symbol, 
                    selectedCurrency
                );
                
                return {
                    ...segment,
                    value: convertedValue
                };
            });
        }
        
        // Recalculate segments with new values
        calculateSegments();
    }

    // Watch for currency changes
    $: if (selectedCurrency) {
        updateCurrencyValues();
    }

    // Watch for token changes
    $: if (tokens) {
        createPieData();
        isLoading = false;
    }

    // Calculate portfolio growth (simplified)
    function calculatePortfolioGrowth() {
        // This is a placeholder - you should replace with real data
        // For now, let's generate a random number between -10 and +10
        return (Math.random() * 20 - 10);
    }

    // Hover event handlers
    function handleMouseEnter(index: number) {
        hoveredSegment = index;
    }

    function handleMouseLeave() {
        hoveredSegment = null;
    }

    // Format value based on currency
    function formatValue(value: number): string {
        if (selectedCurrency === 'btc' || selectedCurrency === 'eth') {
            return value.toFixed(8);
        }
        return value.toFixed(2);
    }

    // Handle image load errors
    function handleImageError(event: Event) {
        const target = event.target as HTMLImageElement;
        const symbol = target.dataset.symbol;
        
        if (symbol) {
            // Try to generate an SVG for the token
            target.src = generateTokenSvg(symbol);
        } else {
            target.src = '/placeholder-coin.png';
        }
    }

    // Get token icon
    function getTokenIcon(symbol: string): string {
        const logoUrls = getTokenLogo(symbol);
        return logoUrls[0] || generateTokenSvg(symbol);
    }

    onMount(() => {
        // Calculate initial growth
        portfolioGrowth = calculatePortfolioGrowth();
        
        // Create initial data
        createPieData();
        
        // Initial loading completed
        isLoading = false;
    });
</script>

<div class="portfolio-container">

    <div class="summary-container">
        <h2>Total Balance</h2>
        <div class="metric">
            <div class="metric-item">
                <div class="value">{currencySymbols[selectedCurrency] || ''}{formatValue(totalBalance)}</div>
            </div>
        </div>
        <div class="currency-toggle">
            {#each Object.keys(currencySymbols) as currency}
                <button 
                    class:active={selectedCurrency === currency}
                    on:click={() => selectedCurrency = currency}
                >
                    {currency.toUpperCase()}
                </button>
            {/each}
        </div>
        <div class="metric-item">
            <div class="metric-label">24h Change</div>
            <div class="value" class:positive={portfolioGrowth > 0} class:negative={portfolioGrowth < 0}>
                {portfolioGrowth > 0 ? '+' : ''}{portfolioGrowth.toFixed(1)}%
            </div>
        </div>
        <p class="balance-update">Last updated: {new Date().toLocaleString()}</p>

    </div>
    
    {#if isLoading}
        <div class="loading">Loading chart data...</div>
    {:else if error}
        <div class="error">{error}</div>
    {:else if pieData.length === 0}
        <div class="empty-state">No assets with balance to display</div>
    {:else}
        <svg 
            width={size} 
            height={size} 
            {viewBox}
            class="pie-chart"
        >
            <!-- Pie segments -->
            {#each segments as segment, index}
                <path
                    d={segment.path}
                    fill={segment.color}
                    class:hover={hoveredSegment === index}
                    on:mouseenter={() => handleMouseEnter(index)}
                    on:mouseleave={handleMouseLeave}
                    class="pie-segment"
                />
                
                <!-- Labels for segments that are large enough -->
                {#if segment.value / totalBalance > 0.05}
                    <g>
                        <!-- Token icon -->
                        <image
                            href={getTokenIcon(segment.symbol)}
                            x={segment.midX - 15}
                            y={segment.midY - 35}
                            width="30"
                            height="30"
                            data-symbol={segment.symbol}
                            on:error={handleImageError}
                        />
                        
                        <!-- Token ticker -->
                        <text 
                            x={segment.midX} 
                            y={segment.midY + 15}
                            text-anchor="middle" 
                            fill="white" 
                            font-weight="bold"
                            font-size="12"
                            class="token-label"
                        >
                            {segment.symbol.toUpperCase()}
                        </text>
                        
                        <!-- Percentage -->
                        <text 
                            x={segment.midX} 
                            y={segment.midY + 40}
                            text-anchor="middle" 
                            fill="white"
                            font-size="10"
                            class="percentage-label" 
                        >
                            {((segment.value / totalBalance) * 100).toFixed(1)}%
                        </text>
                    </g>
                {/if}
            {/each}
            
            <!-- Center circle -->
            <circle 
                r={radius / 2} 
                cx={radius} 
                cy={radius} 
                fill={bgColor} 
                class="center-circle"
            />

            <!-- Tooltip for hovered segment -->
            {#if hoveredSegment !== null && segments[hoveredSegment]}
                {@const segment = segments[hoveredSegment]}
                {@const tooltipX = segment.midX > radius ? segment.midX - 20 : segment.midX - 80}
                {@const tooltipY = segment.midY > radius ? segment.midY - 50 : segment.midY - 80}
                
                <g class="tooltip">
                    <rect 
                        x={tooltipX} 
                        y={tooltipY} 
                        width="160" 
                        height="160" 
                        rx="10" 
                        fill="rgba(0,0,0,0.8)" 
                    />
                    <text x={tooltipX + 80} y={tooltipY + 30} text-anchor="middle" fill="white" font-weight="bold" font-size="14">
                        {segment.label}
                    </text>
                    <text x={tooltipX + 80} y={tooltipY + 60} text-anchor="middle" fill="white" font-size="12">
                        {segment.symbol.toUpperCase()}
                    </text>
                    <text x={tooltipX + 80} y={tooltipY + 100} text-anchor="middle" fill="white" font-size="16" font-weight="bold">
                        {currencySymbols[selectedCurrency] || ''}{formatValue(segment.value)}
                    </text>
                    <text x={tooltipX + 80} y={tooltipY + 130} text-anchor="middle" fill="white" font-size="14">
                        {((segment.value / totalBalance) * 100).toFixed(1)}% of portfolio
                    </text>
                </g>
            {/if}
        </svg>
    {/if}

</div>

<style>
    .portfolio-container {
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: 0;
        padding-bottom: 1rem;
        background: linear-gradient(135deg, #3a76d8 0%, #9013fe 100%);
        border-radius: 4rem;
        margin-top: 1rem;
        color: white;
        width: 100%;

        h2 {
            font-size: 2rem;
        }
    }
    
    .summary-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-left: 1rem;
        margin-bottom: 1rem;
        width: 50%;

    }
    
    .metric {
        text-align: center;
        margin-bottom: 15px;
    }
    
    .metric-item {
        padding: 10px;
    }
    
    .metric-label {
        font-size: 14px;
        color: #a0a0a0;
        margin-bottom: 5px;
    }
    
    .value {
        font-size: 3rem;
        font-weight: bold;
    }
    
    .positive {
        color: #4BC0C0;
    }
    
    .negative {
        color: #FF6384;
    }
    
    .currency-toggle {
        display: flex;
        margin: 15px 0;
        flex-wrap: wrap;
        justify-content: center;
    }
    
    .currency-toggle button {
        background: linear-gradient(135deg, #3a76d8 0%, #9013fe 100%);
        border: none;
        color: #a0a0a0;
        padding: 8px 16px;
        margin: 0 5px;
        margin-bottom: 5px;
        border-radius: 2rem;
        cursor: pointer;
        transition: all 0.2s;
    }
    
    .currency-toggle button.active {
        background: #36A2EB;
        color: white;
    }
    
    .pie-chart {
        margin-top: 20px;
    }
    
    .pie-segment {
        transition: opacity 0.3s;
        background: linear-gradient(135deg, #3a76d8 0%, #9013fe 100%);
        stroke-width: 1;
    }
    
    .pie-segment.hover {
        opacity: 0.8;
        stroke: white;
        stroke-width: 2;
    }
    
    .center-circle {
        filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.5));
    }
    
    .token-label, .percentage-label {
        filter: drop-shadow(0 0 3px rgba(0, 0, 0, 0.8));
    }
    
    .tooltip {
        pointer-events: none;
    }
    
    .loading, .error, .empty-state {
        height: 200px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #a0a0a0;
    }
    
    .error {
        color: #FF6384;
    }
    @media (max-width: 1000px) {
        .portfolio-container {
            flex-direction: column;
        }
    }
    @media (max-width: 480px) {
        .portfolio-container {
            padding: 10px;
        }
        
        .value {
            font-size: 24px;
        }
        
        .currency-toggle button {
            padding: 6px 12px;
            font-size: 12px;
        }
    }
</style>