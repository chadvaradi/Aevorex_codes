# 📋 AEVOREX DEVELOPMENT RULES & GUIDELINES
**Version:** 1.0  
**Last Updated:** 2025-01-26  
**Purpose:** Specific rules and guidelines for consistent development across all Aevorex modules

---

## 🎯 CORE DEVELOPMENT PRINCIPLES

### 1. **Premium-First Development**
- Every feature must enhance the premium user experience
- No compromises on performance or visual quality
- Elegant, minimalistic design over feature bloat
- Speed and efficiency are non-negotiable

### 2. **Modular Architecture Enforcement**
- Each module operates independently
- No cross-module dependencies except through `/shared/`
- Reusable components must be placed in appropriate shared directories
- Clear separation of concerns at all levels

### 3. **AI-Assisted Development Standards**
- AI tools must follow these rules consistently
- All AI-generated code must be reviewed and optimized
- AI suggestions must align with Aevorex architecture principles
- Human oversight required for architectural decisions

---

## 📁 FOLDER ORGANIZATION RULES

### **Mandatory Folder Structure**

#### **Root Level Structure:**
```
Aevorex_codes/
├── modules/                    # All application modules (NEVER modify this structure)
├── shared/                     # Global shared resources
├── system-prompts-and-models-of-ai-tools/  # AI configurations
├── requirements.txt            # Python dependencies (symlink to shared/configs/)
├── start_server.py            # Server startup
├── shell.nix                  # Nix configuration
└── vscode/                    # IDE configuration
```

#### **Module Structure (Mandatory for ALL modules):**
```
modules/{module_name}/
├── backend/                   # Backend services (if applicable)
│   ├── api/                  # API endpoints
│   ├── core/                 # Business logic
│   ├── models/               # Data models
│   ├── utils/                # Utilities
│   ├── config.py            # Configuration
│   └── main.py              # Application entry
├── frontend/                 # Frontend assets (if applicable)
│   ├── static/              # Static assets
│   │   ├── css/            # Stylesheets (7-layer system)
│   │   ├── js/             # JavaScript modules
│   │   └── images/         # Image assets
│   └── templates/          # HTML templates
├── configs/                  # Module-specific configurations
├── logs/                     # Application logs
├── archive/                  # Archived files (if needed)
├── README.md                 # Module documentation
└── __init__.py              # Python package marker
```

### **CSS Organization (7-Layer System)**
```
css/
├── 01-base/                  # Foundation styles
│   ├── colors.css           # Color variables
│   ├── typography.css       # Font definitions
│   ├── variables.css        # CSS custom properties
│   ├── spacing.css          # Spacing utilities
│   ├── reset.css            # CSS reset
│   └── global.css           # Global styles
├── 02-shared/               # Shared components
│   ├── animations/          # Animation utilities
│   ├── buttons/             # Button styles
│   ├── forms/               # Form styles
│   ├── utilities/           # Utility classes
│   ├── fonts.css           # Font imports
│   ├── typography.css      # Typography utilities
│   └── utilities.css       # General utilities
├── 03-layout/               # Layout systems
│   ├── app-container.css   # Main container
│   ├── grid.css            # Grid system
│   ├── header.css          # Header layout
│   ├── footer.css          # Footer layout
│   └── main-content.css    # Content area
├── 04-components/           # UI components
│   ├── {component-name}/   # Component-specific styles
│   └── effects/            # Visual effects
├── 05-themes/               # Theme variations
│   ├── premium-light.css   # Light theme
│   └── premium-dark.css    # Dark theme
├── 06-pages/                # Page-specific styles
│   └── {module}-main.css   # Main page styles
├── 07-vendor/               # Third-party customizations
│   └── {library}-custom.css
└── {module}-master.css      # Main CSS entry point
```

### **JavaScript Organization**
```
js/
├── core/                    # Core functionality
│   ├── api-client.js       # API communication
│   ├── utils.js            # Utility functions
│   └── app-coordinator.js  # Application coordination
├── components/              # UI components
│   ├── {component-name}/   # Component-specific logic
│   │   ├── {component}-manager.js
│   │   └── {component}.js
├── utils/                   # Utility functions
│   ├── api.js              # API helpers
│   ├── helpers.js          # General helpers
│   ├── constants.js        # Constants
│   ├── storage.js          # Storage utilities
│   └── data-service.js     # Data services
├── src/                     # Source files
│   └── main.js             # Main entry point
├── main.js                 # Application entry
└── {feature}.js            # Feature-specific files
```

---

## 🚫 PROHIBITED PRACTICES

### **Folder Structure Violations:**
- ❌ Creating parallel folder structures
- ❌ Mixing backend and frontend files in the same directory
- ❌ Creating custom folder names outside the standard structure
- ❌ Placing shared code in module-specific directories
- ❌ Creating backup folders in the main structure

### **Code Quality Violations:**
- ❌ Inline styles in HTML or JavaScript
- ❌ Files exceeding 250 lines without proper splitting
- ❌ Hardcoded values instead of configuration
- ❌ Missing error handling for async operations
- ❌ Inconsistent naming conventions

### **Architecture Violations:**
- ❌ Cross-module dependencies (except through shared/)
- ❌ Duplicating functionality across modules
- ❌ Breaking the 7-layer CSS system
- ❌ Mixing concerns in single files
- ❌ Creating circular dependencies

---

## ✅ MANDATORY PRACTICES

### **Before Any Development:**
1. **Repository Scan** - Always scan the entire codebase first
2. **Documentation Review** - Check existing documentation for context
3. **Architecture Compliance** - Verify changes align with architecture
4. **Impact Assessment** - Evaluate impact on other modules
5. **Performance Consideration** - Assess performance implications

### **During Development:**
1. **Follow Naming Conventions** - Use kebab-case for files, camelCase for variables
2. **Implement Error Handling** - All async operations need try-catch blocks
3. **Write Documentation** - Document complex logic and business rules
4. **Test Thoroughly** - Test across different browsers and devices
5. **Optimize Performance** - Ensure 60fps animations and fast loading

### **After Development:**
1. **Code Review** - All code must be reviewed before deployment
2. **Testing** - Run all tests and ensure they pass
3. **Documentation Update** - Update relevant documentation
4. **Performance Validation** - Verify Lighthouse score ≥ 90
5. **Security Check** - Ensure no security vulnerabilities

---

## 📝 FILE NAMING CONVENTIONS

### **General Rules:**
- Use `kebab-case` for all files and directories
- Names must be descriptive and indicate purpose
- No spaces, special characters, or uppercase letters
- Use standard file extensions

### **Specific Conventions:**

#### **Frontend Files:**
```
CSS Files:
- component-name.css
- feature-name.css
- {module}-master.css

JavaScript Files:
- component-manager.js
- feature-handler.js
- {component}-{purpose}.js

HTML Templates:
- page-name.html
- component-name.html

Images:
- descriptive-name.svg
- icon-name.png
- logo-variant.jpg
```

#### **Backend Files:**
```
Python Files:
- snake_case.py
- resource_name.py (e.g., stock.py)
- model_name.py (e.g., stock_model.py)
- utility_name.py (e.g., data_fetcher.py)

Configuration Files:
- config.py
- settings.py
- {environment}.env
```

#### **Documentation Files:**
```
Markdown Files:
- README.md
- FEATURE_NAME.md
- ARCHITECTURE_GUIDE.md

Text Files:
- requirements.txt
- changelog.txt
- notes.txt
```

---

## 🎨 CSS DEVELOPMENT RULES

### **7-Layer System Compliance:**
1. **01-base/** - Only foundation styles (reset, typography, colors, variables)
2. **02-shared/** - Only reusable components (buttons, forms, utilities)
3. **03-layout/** - Only layout systems (grid, containers, positioning)
4. **04-components/** - Only UI components specific to the module
5. **05-themes/** - Only theme variations (light, dark, premium)
6. **06-pages/** - Only page-specific styles
7. **07-vendor/** - Only third-party library customizations

### **CSS Coding Standards:**
```css
/* Use CSS custom properties for all dynamic values */
:root {
    --primary-color: #007bff;
    --secondary-color: #6c757d;
    --font-size-base: 1rem;
    --spacing-unit: 0.5rem;
}

/* Follow BEM methodology */
.block__element--modifier {
    /* Component styles */
}

/* Mobile-first responsive design */
.component {
    /* Mobile styles first */
}

@media (min-width: 768px) {
    .component {
        /* Tablet styles */
    }
}

@media (min-width: 1024px) {
    .component {
        /* Desktop styles */
    }
}
```

### **CSS Performance Rules:**
- Minimize CSS bundle size
- Use critical CSS for above-the-fold content
- Avoid deep nesting (max 3 levels)
- Use efficient selectors
- Minimize use of `!important`

---

## 💻 JAVASCRIPT DEVELOPMENT RULES

### **Modern JavaScript Standards:**
```javascript
// Use ES6+ syntax
class ComponentManager {
    constructor(options = {}) {
        this.options = { ...this.defaultOptions, ...options };
        this.state = new Map();
        this.init();
    }

    // Use async/await over promises
    async loadData() {
        try {
            const response = await this.apiClient.get('/data');
            return response.data;
        } catch (error) {
            this.handleError(error);
            throw error;
        }
    }

    // Implement proper error handling
    handleError(error) {
        console.error('Component error:', error);
        this.showErrorMessage(error.message);
    }

    // Clean up resources
    destroy() {
        this.removeEventListeners();
        this.clearTimers();
        this.state.clear();
    }
}
```

### **Component Structure Standards:**
```javascript
class ComponentName {
    constructor(element, options = {}) {
        this.element = element;
        this.options = { ...this.defaultOptions, ...options };
        this.state = {};
        this.elements = {};
        this.init();
    }

    get defaultOptions() {
        return {
            // Default configuration
        };
    }

    init() {
        this.findElements();
        this.bindEvents();
        this.loadData();
        this.render();
    }

    findElements() {
        // Cache DOM elements
        this.elements = {
            container: this.element.querySelector('.container'),
            button: this.element.querySelector('.button'),
            // ... other elements
        };
    }

    bindEvents() {
        // Event delegation and binding
        this.elements.button?.addEventListener('click', this.handleClick.bind(this));
    }

    async loadData() {
        // Data loading logic
    }

    render() {
        // Rendering logic
    }

    handleClick(event) {
        // Event handling
    }

    destroy() {
        // Cleanup logic
    }
}
```

### **Performance Requirements:**
- Use `requestAnimationFrame` for animations
- Implement lazy loading for heavy components
- Use event delegation for dynamic content
- Minimize DOM queries and cache elements
- Implement proper memory management

---

## 🔧 BACKEND DEVELOPMENT RULES

### **FastAPI Standards:**
```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# Router definition
router = APIRouter(prefix="/api/v1", tags=["resource"])

# Pydantic models for validation
class ResourceRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    
class ResourceResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# Endpoint implementation
@router.get("/resources", response_model=List[ResourceResponse])
async def get_resources(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Retrieve a list of resources.
    
    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        db: Database session
        
    Returns:
        List of resources
        
    Raises:
        HTTPException: If database error occurs
    """
    try:
        resources = await resource_service.get_resources(db, skip, limit)
        return resources
    except Exception as e:
        logger.error(f"Error retrieving resources: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
```

### **Error Handling Standards:**
```python
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

class ServiceException(Exception):
    """Custom service exception"""
    pass

async def service_function():
    try:
        # Business logic
        result = await external_api_call()
        return result
    except ExternalAPIError as e:
        logger.error(f"External API error: {e}")
        raise ServiceException(f"Failed to fetch data: {e}")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise ServiceException("Internal service error")

@router.get("/endpoint")
async def endpoint():
    try:
        result = await service_function()
        return result
    except ServiceException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Endpoint error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
```

---

## 📊 PERFORMANCE REQUIREMENTS

### **Frontend Performance:**
- **Lighthouse Score:** ≥ 90 for all metrics
- **First Contentful Paint:** < 1.5 seconds
- **Largest Contentful Paint:** < 2.5 seconds
- **Cumulative Layout Shift:** < 0.1
- **First Input Delay:** < 100ms

### **Animation Performance:**
- Use `requestAnimationFrame` for all animations
- Maintain 60fps during animations
- Use CSS transforms and opacity for smooth animations
- Avoid animating layout properties

### **Backend Performance:**
- **API Response Time:** < 500ms for 95th percentile
- **Database Query Time:** < 100ms for simple queries
- **Memory Usage:** Monitor and prevent memory leaks
- **CPU Usage:** Optimize for efficient processing

### **Asset Optimization:**
- Compress all images (WebP format preferred)
- Minify CSS and JavaScript
- Use CDN for static assets
- Implement proper caching strategies

---

## 🔒 SECURITY REQUIREMENTS

### **Input Validation:**
```python
from pydantic import BaseModel, Field, validator
import re

class UserInput(BaseModel):
    email: str = Field(..., regex=r'^[^@]+@[^@]+\.[^@]+$')
    password: str = Field(..., min_length=8)
    
    @validator('password')
    def validate_password(cls, v):
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain digit')
        return v
```

### **API Security:**
- Implement rate limiting on all endpoints
- Use HTTPS for all communications
- Validate all inputs using Pydantic models
- Implement proper authentication and authorization
- Use CORS configuration appropriately

### **Frontend Security:**
- Sanitize all user inputs
- Use Content Security Policy (CSP)
- Implement proper error boundaries
- Avoid exposing sensitive data in client-side code

---

## 📋 TESTING REQUIREMENTS

### **Frontend Testing:**
```javascript
// Unit tests for components
describe('ComponentName', () => {
    let component;
    
    beforeEach(() => {
        document.body.innerHTML = '<div id="test-container"></div>';
        component = new ComponentName(document.getElementById('test-container'));
    });
    
    afterEach(() => {
        component.destroy();
        document.body.innerHTML = '';
    });
    
    test('should initialize correctly', () => {
        expect(component.element).toBeDefined();
        expect(component.state).toBeDefined();
    });
    
    test('should handle user interactions', async () => {
        const button = component.elements.button;
        button.click();
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        expect(component.state.clicked).toBe(true);
    });
});
```

### **Backend Testing:**
```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_resources():
    response = client.get("/api/v1/resources")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_create_resource():
    resource_data = {
        "name": "Test Resource",
        "description": "Test Description"
    }
    response = client.post("/api/v1/resources", json=resource_data)
    assert response.status_code == 201
    assert response.json()["name"] == resource_data["name"]

@pytest.mark.asyncio
async def test_service_function():
    result = await service_function()
    assert result is not None
```

### **Testing Standards:**
- Minimum 80% test coverage for all modules
- Unit tests for all business logic
- Integration tests for API endpoints
- End-to-end tests for critical user flows
- Performance tests for high-load scenarios

---

## 📚 DOCUMENTATION REQUIREMENTS

### **Code Documentation:**
```python
def calculate_technical_indicators(
    price_data: List[float],
    period: int = 14
) -> Dict[str, float]:
    """
    Calculate technical indicators for stock analysis.
    
    This function computes various technical indicators including RSI, MACD,
    and moving averages based on the provided price data.
    
    Args:
        price_data: List of historical price points in chronological order
        period: Period for indicator calculations (default: 14)
        
    Returns:
        Dictionary containing calculated indicators:
        - rsi: Relative Strength Index (0-100)
        - macd: MACD line value
        - signal: MACD signal line value
        - sma: Simple Moving Average
        
    Raises:
        ValueError: If price_data is empty or period is invalid
        TypeError: If price_data contains non-numeric values
        
    Example:
        >>> prices = [100.0, 102.0, 98.0, 105.0, 103.0]
        >>> indicators = calculate_technical_indicators(prices, period=5)
        >>> print(f"RSI: {indicators['rsi']:.2f}")
        RSI: 45.23
        
    Note:
        Requires at least 'period' number of data points for accurate calculation.
    """
```

### **README Standards:**
Each module must have a comprehensive README.md with:
- Purpose and overview
- Installation instructions
- Usage examples
- API documentation
- Configuration options
- Troubleshooting guide
- Contributing guidelines

### **API Documentation:**
- OpenAPI/Swagger documentation for all endpoints
- Request/response examples
- Error code documentation
- Authentication requirements
- Rate limiting information

---

## 🚀 DEPLOYMENT RULES

### **Environment Configuration:**
```python
# config.py
import os
from pydantic import BaseSettings

class Settings(BaseSettings):
    app_name: str = "Aevorex Module"
    debug: bool = False
    database_url: str
    secret_key: str
    api_key: str
    
    class Config:
        env_file = ".env"

settings = Settings()
```

### **Docker Configuration:**
```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### **Deployment Checklist:**
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Static assets optimized and deployed
- [ ] SSL certificates configured
- [ ] Monitoring and logging set up
- [ ] Backup strategy implemented
- [ ] Health checks configured
- [ ] Load balancing configured (if applicable)

---

## 🔍 QUALITY ASSURANCE

### **Code Review Checklist:**
- [ ] Follows naming conventions
- [ ] Implements proper error handling
- [ ] Includes appropriate tests
- [ ] Documentation is complete and accurate
- [ ] Performance requirements met
- [ ] Security best practices followed
- [ ] No code duplication
- [ ] Follows architectural patterns

### **Pre-Deployment Checklist:**
- [ ] All tests passing
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Performance benchmarks met
- [ ] Security scan passed
- [ ] Accessibility requirements met
- [ ] Cross-browser compatibility verified
- [ ] Mobile responsiveness confirmed

---

## 📞 SUPPORT AND ESCALATION

### **Issue Classification:**
- **Critical:** Production down, security breach, data loss
- **High:** Major functionality broken, performance degradation
- **Medium:** Minor functionality issues, non-critical bugs
- **Low:** Enhancement requests, documentation updates

### **Escalation Process:**
1. **Developer Level:** Initial troubleshooting and fixes
2. **Team Lead Level:** Complex issues requiring architectural decisions
3. **Technical Lead Level:** Cross-module issues and major changes
4. **Management Level:** Business impact and resource allocation

### **Emergency Procedures:**
- Immediate notification for critical issues
- Rollback procedures for failed deployments
- Incident response team activation
- Communication plan for stakeholders

---

**Last Updated:** 2025-01-26  
**Next Review:** 2025-04-26  
**Document Owner:** Aevorex Development Team

---

*These rules are mandatory for all development work on the Aevorex platform. Compliance ensures consistency, quality, and maintainability across all modules.* 