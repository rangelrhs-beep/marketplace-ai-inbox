from .amazon.service import AmazonService
from .magalu.service import MagaluService
from .mercado_livre.service import MercadoLivreService
from .shopee.service import ShopeeService
from .tiny_erp.service import TinyErpService


services = {
    "mercado-livre": MercadoLivreService(),
    "shopee": ShopeeService(),
    "magalu": MagaluService(),
    "amazon": AmazonService(),
    "tiny-erp": TinyErpService(),
}
