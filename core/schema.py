import graphene

class Query(graphene.ObjectType):
    # creamos una consulta de prueba llamada 'hello'
    hello = graphene.String(default_value="TEST DB HAVENS")