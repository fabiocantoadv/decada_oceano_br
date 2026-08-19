import pandas as pd
import json
import os
from collections import defaultdict, Counter
import unicodedata

# ─────────────────────────────────────────────────────────────────────────────
# Dicionário de nomes brasileiros / internacionais comuns para resgate de
# registros classificados como INDEFINIDO pelo serviço externo de gênero.
# Fonte: IBGE (nomes mais frequentes), complementado manualmente.
# ─────────────────────────────────────────────────────────────────────────────
NAME_GENDER_DICT = {
    # ── Masculinos ──────────────────────────────────────────────────────────
    'abel': 'MASCULINO', 'abilio': 'MASCULINO', 'adalberto': 'MASCULINO',
    'adelmo': 'MASCULINO', 'adilson': 'MASCULINO', 'adilton': 'MASCULINO',
    'adolfo': 'MASCULINO', 'adriano': 'MASCULINO', 'agostinho': 'MASCULINO',
    'ailton': 'MASCULINO', 'alan': 'MASCULINO', 'alberto': 'MASCULINO',
    'alceu': 'MASCULINO', 'aldo': 'MASCULINO', 'alejandro': 'MASCULINO',
    'alex': 'MASCULINO', 'alexandre': 'MASCULINO', 'alexis': 'MASCULINO',
    'alfredo': 'MASCULINO', 'almir': 'MASCULINO', 'alvaro': 'MASCULINO',
    'amadeu': 'MASCULINO', 'americo': 'MASCULINO', 'amilton': 'MASCULINO',
    'anderson': 'MASCULINO', 'andre': 'MASCULINO', 'andrei': 'MASCULINO',
    'andreo': 'MASCULINO', 'angelo': 'MASCULINO', 'anselmo': 'MASCULINO',
    'antonio': 'MASCULINO', 'ariel': 'MASCULINO', 'armando': 'MASCULINO',
    'arnaldo': 'MASCULINO', 'artur': 'MASCULINO', 'arthur': 'MASCULINO',
    'augusto': 'MASCULINO', 'aurelio': 'MASCULINO', 'benedito': 'MASCULINO',
    'bernardo': 'MASCULINO', 'breno': 'MASCULINO', 'bruno': 'MASCULINO',
    'caio': 'MASCULINO', 'caique': 'MASCULINO', 'calos': 'MASCULINO',
    'carlos': 'MASCULINO', 'cassio': 'MASCULINO', 'celso': 'MASCULINO',
    'cesar': 'MASCULINO', 'charles': 'MASCULINO', 'christian': 'MASCULINO',
    'christiano': 'MASCULINO', 'cicero': 'MASCULINO', 'claudio': 'MASCULINO',
    'cleber': 'MASCULINO', 'clecio': 'MASCULINO', 'cleiton': 'MASCULINO',
    'cleto': 'MASCULINO', 'clovis': 'MASCULINO', 'cristian': 'MASCULINO',
    'cristiano': 'MASCULINO', 'cristovao': 'MASCULINO', 'dario': 'MASCULINO',
    'david': 'MASCULINO', 'deivid': 'MASCULINO', 'denis': 'MASCULINO',
    'denilson': 'MASCULINO', 'denis': 'MASCULINO', 'derick': 'MASCULINO',
    'diego': 'MASCULINO', 'diogo': 'MASCULINO', 'dirceu': 'MASCULINO',
    'djalma': 'MASCULINO', 'douglas': 'MASCULINO', 'duarte': 'MASCULINO',
    'durval': 'MASCULINO', 'edgar': 'MASCULINO', 'edmar': 'MASCULINO',
    'edmilson': 'MASCULINO', 'edmond': 'MASCULINO', 'edson': 'MASCULINO',
    'eduardo': 'MASCULINO', 'elias': 'MASCULINO', 'elio': 'MASCULINO',
    'elizeu': 'MASCULINO', 'elvis': 'MASCULINO', 'emerson': 'MASCULINO',
    'emilio': 'MASCULINO', 'emmanuel': 'MASCULINO', 'eneas': 'MASCULINO',
    'enzo': 'MASCULINO', 'erico': 'MASCULINO', 'ernani': 'MASCULINO',
    'ernesto': 'MASCULINO', 'estevao': 'MASCULINO', 'eugenio': 'MASCULINO',
    'evandro': 'MASCULINO', 'ezequiel': 'MASCULINO', 'fabiano': 'MASCULINO',
    'fabio': 'MASCULINO', 'fabricio': 'MASCULINO', 'felipe': 'MASCULINO',
    'felix': 'MASCULINO', 'fernando': 'MASCULINO', 'filipe': 'MASCULINO',
    'flavio': 'MASCULINO', 'francisco': 'MASCULINO', 'frederico': 'MASCULINO',
    'gabriel': 'MASCULINO', 'geraldo': 'MASCULINO', 'gil': 'MASCULINO',
    'gilberto': 'MASCULINO', 'gilmar': 'MASCULINO', 'giovani': 'MASCULINO',
    'giovanny': 'MASCULINO', 'giulio': 'MASCULINO', 'glauco': 'MASCULINO',
    'graciliano': 'MASCULINO', 'gregorio': 'MASCULINO', 'guilherme': 'MASCULINO',
    'gustavo': 'MASCULINO', 'han': 'MASCULINO', 'helio': 'MASCULINO',
    'henrique': 'MASCULINO', 'herbert': 'MASCULINO', 'heriberto': 'MASCULINO',
    'hernando': 'MASCULINO', 'hilton': 'MASCULINO', 'homero': 'MASCULINO',
    'horacio': 'MASCULINO', 'hugo': 'MASCULINO', 'humberto': 'MASCULINO',
    'igor': 'MASCULINO', 'ilton': 'MASCULINO', 'italo': 'MASCULINO',
    'ivan': 'MASCULINO', 'ivano': 'MASCULINO', 'ivo': 'MASCULINO',
    'jacob': 'MASCULINO', 'jadson': 'MASCULINO', 'jaime': 'MASCULINO',
    'jamil': 'MASCULINO', 'jandir': 'MASCULINO', 'janio': 'MASCULINO',
    'jardel': 'MASCULINO', 'javier': 'MASCULINO', 'jefferson': 'MASCULINO',
    'jhonatan': 'MASCULINO', 'joao': 'MASCULINO', 'joaquim': 'MASCULINO',
    'joe': 'MASCULINO', 'joel': 'MASCULINO', 'jonas': 'MASCULINO',
    'jonathan': 'MASCULINO', 'jorge': 'MASCULINO', 'jose': 'MASCULINO',
    'josue': 'MASCULINO', 'juarez': 'MASCULINO', 'julio': 'MASCULINO',
    'junior': 'MASCULINO', 'kevin': 'MASCULINO', 'kleber': 'MASCULINO',
    'laercio': 'MASCULINO', 'lazaro': 'MASCULINO', 'leandro': 'MASCULINO',
    'leon': 'MASCULINO', 'leonardo': 'MASCULINO', 'leones': 'MASCULINO',
    'leonidas': 'MASCULINO', 'luan': 'MASCULINO', 'luciano': 'MASCULINO',
    'luigi': 'MASCULINO', 'luis': 'MASCULINO', 'luiz': 'MASCULINO',
    'lúcio': 'MASCULINO', 'lucio': 'MASCULINO', 'magnus': 'MASCULINO',
    'manoel': 'MASCULINO', 'manuel': 'MASCULINO', 'marcelo': 'MASCULINO',
    'marcio': 'MASCULINO', 'marco': 'MASCULINO', 'marcos': 'MASCULINO',
    'mario': 'MASCULINO', 'mateus': 'MASCULINO', 'matheus': 'MASCULINO',
    'mauricio': 'MASCULINO', 'mauro': 'MASCULINO', 'maximo': 'MASCULINO',
    'miguel': 'MASCULINO', 'moisés': 'MASCULINO', 'moises': 'MASCULINO',
    'murilo': 'MASCULINO', 'natan': 'MASCULINO', 'nathan': 'MASCULINO',
    'nelson': 'MASCULINO', 'newton': 'MASCULINO', 'nicolás': 'MASCULINO',
    'nicolas': 'MASCULINO', 'nilton': 'MASCULINO', 'nivaldo': 'MASCULINO',
    'norberto': 'MASCULINO', 'obed': 'MASCULINO', 'odair': 'MASCULINO',
    'olavo': 'MASCULINO', 'olimpio': 'MASCULINO', 'omar': 'MASCULINO',
    'osmar': 'MASCULINO', 'osmario': 'MASCULINO', 'osvaldo': 'MASCULINO',
    'otavio': 'MASCULINO', 'pablo': 'MASCULINO', 'paulo': 'MASCULINO',
    'pedro': 'MASCULINO', 'rafael': 'MASCULINO', 'rainaldo': 'MASCULINO',
    'raul': 'MASCULINO', 'reinaldo': 'MASCULINO', 'renato': 'MASCULINO',
    'renzo': 'MASCULINO', 'rhuan': 'MASCULINO', 'ricardo': 'MASCULINO',
    'roberto': 'MASCULINO', 'rodrigo': 'MASCULINO', 'rogerio': 'MASCULINO',
    'roman': 'MASCULINO', 'romario': 'MASCULINO', 'ronaldo': 'MASCULINO',
    'ronan': 'MASCULINO', 'rubens': 'MASCULINO', 'ruben': 'MASCULINO',
    'rui': 'MASCULINO', 'samuel': 'MASCULINO', 'saulo': 'MASCULINO',
    'sebastiao': 'MASCULINO', 'sérgio': 'MASCULINO', 'sergio': 'MASCULINO',
    'silvano': 'MASCULINO', 'silvio': 'MASCULINO', 'simao': 'MASCULINO',
    'stefano': 'MASCULINO', 'tarcisio': 'MASCULINO', 'thiago': 'MASCULINO',
    'tiago': 'MASCULINO', 'tomas': 'MASCULINO', 'tulio': 'MASCULINO',
    'ulisses': 'MASCULINO', 'uriel': 'MASCULINO', 'vagner': 'MASCULINO',
    'valdemar': 'MASCULINO', 'valentim': 'MASCULINO', 'valerio': 'MASCULINO',
    'vasco': 'MASCULINO', 'vinicius': 'MASCULINO', 'vitor': 'MASCULINO',
    'vlademir': 'MASCULINO', 'wagner': 'MASCULINO', 'walter': 'MASCULINO',
    'washington': 'MASCULINO', 'wendel': 'MASCULINO', 'william': 'MASCULINO',
    'wladimir': 'MASCULINO', 'yder': 'MASCULINO', 'yuri': 'MASCULINO',
    'yago': 'MASCULINO',
    # ── Femininos ───────────────────────────────────────────────────────────
    'abigail': 'FEMININO', 'adalice': 'FEMININO', 'adelia': 'FEMININO',
    'adriana': 'FEMININO', 'agatha': 'FEMININO', 'agnes': 'FEMININO',
    'aida': 'FEMININO', 'aldeni': 'FEMININO', 'alessandra': 'FEMININO',
    'aline': 'FEMININO', 'alice': 'FEMININO', 'alicia': 'FEMININO',
    'alivio': 'FEMININO', 'amanda': 'FEMININO', 'amelia': 'FEMININO',
    'ana': 'FEMININO', 'andréa': 'FEMININO', 'andrea': 'FEMININO',
    'andreia': 'FEMININO', 'anelise': 'FEMININO', 'angela': 'FEMININO',
    'angelica': 'FEMININO', 'ania': 'FEMININO', 'anizia': 'FEMININO',
    'anna': 'FEMININO', 'antonia': 'FEMININO', 'aparecida': 'FEMININO',
    'beatriz': 'FEMININO', 'berenice': 'FEMININO', 'bianca': 'FEMININO',
    'bruna': 'FEMININO', 'camila': 'FEMININO', 'carla': 'FEMININO',
    'carlota': 'FEMININO', 'carolina': 'FEMININO', 'caroline': 'FEMININO',
    'cassia': 'FEMININO', 'catarina': 'FEMININO', 'cecilia': 'FEMININO',
    'celia': 'FEMININO', 'christiane': 'FEMININO', 'cintia': 'FEMININO',
    'cláudia': 'FEMININO', 'claudia': 'FEMININO', 'cleide': 'FEMININO',
    'conceicao': 'FEMININO', 'cristiane': 'FEMININO', 'cristina': 'FEMININO',
    'daiana': 'FEMININO', 'daiane': 'FEMININO', 'daniela': 'FEMININO',
    'danielle': 'FEMININO', 'danyelle': 'FEMININO', 'debora': 'FEMININO',
    'denise': 'FEMININO', 'diana': 'FEMININO', 'dulce': 'FEMININO',
    'edna': 'FEMININO', 'elaine': 'FEMININO', 'elena': 'FEMININO',
    'eliana': 'FEMININO', 'eliane': 'FEMININO', 'elisa': 'FEMININO',
    'elisabete': 'FEMININO', 'elisangela': 'FEMININO', 'elizabete': 'FEMININO',
    'elizangela': 'FEMININO', 'emilia': 'FEMININO', 'erica': 'FEMININO',
    'erika': 'FEMININO', 'ester': 'FEMININO', 'estela': 'FEMININO',
    'eugenia': 'FEMININO', 'fabiana': 'FEMININO', 'fatima': 'FEMININO',
    'fernanda': 'FEMININO', 'flavia': 'FEMININO', 'francisca': 'FEMININO',
    'gabriela': 'FEMININO', 'gisele': 'FEMININO', 'giseli': 'FEMININO',
    'gloria': 'FEMININO', 'graciele': 'FEMININO', 'graziela': 'FEMININO',
    'helena': 'FEMININO', 'hellen': 'FEMININO', 'ines': 'FEMININO',
    'ingrid': 'FEMININO', 'irene': 'FEMININO', 'iris': 'FEMININO',
    'isabel': 'FEMININO', 'isabella': 'FEMININO', 'ivanete': 'FEMININO',
    'ivone': 'FEMININO', 'jacqueline': 'FEMININO', 'janaina': 'FEMININO',
    'jane': 'FEMININO', 'jaqueline': 'FEMININO', 'jessica': 'FEMININO',
    'joana': 'FEMININO', 'josiane': 'FEMININO', 'jovita': 'FEMININO',
    'julia': 'FEMININO', 'juliana': 'FEMININO', 'julieta': 'FEMININO',
    'karen': 'FEMININO', 'katia': 'FEMININO', 'katya': 'FEMININO',
    'kelly': 'FEMININO', 'lais': 'FEMININO', 'larissa': 'FEMININO',
    'laura': 'FEMININO', 'leila': 'FEMININO', 'lena': 'FEMININO',
    'leticia': 'FEMININO', 'lidia': 'FEMININO', 'lilian': 'FEMININO',
    'liliane': 'FEMININO', 'liz': 'FEMININO', 'lorena': 'FEMININO',
    'lucia': 'FEMININO', 'luciana': 'FEMININO', 'luzia': 'FEMININO',
    'luiz': 'MASCULINO',
    'madalena': 'FEMININO', 'maira': 'FEMININO', 'manuela': 'FEMININO',
    'marcela': 'FEMININO', 'marcia': 'FEMININO', 'margarete': 'FEMININO',
    'margarida': 'FEMININO', 'maria': 'FEMININO', 'mariana': 'FEMININO',
    'mariangela': 'FEMININO', 'marilia': 'FEMININO', 'marina': 'FEMININO',
    'marta': 'FEMININO', 'mary': 'FEMININO', 'mayara': 'FEMININO',
    'mayla': 'FEMININO', 'melina': 'FEMININO', 'melissa': 'FEMININO',
    'mirian': 'FEMININO', 'miriam': 'FEMININO', 'monica': 'FEMININO',
    'monique': 'FEMININO', 'nadia': 'FEMININO', 'nadja': 'FEMININO',
    'natalia': 'FEMININO', 'nathalia': 'FEMININO', 'nathalie': 'FEMININO',
    'nayra': 'FEMININO', 'nicole': 'FEMININO', 'nubia': 'FEMININO',
    'odete': 'FEMININO', 'oleide': 'FEMININO', 'patricia': 'FEMININO',
    'paula': 'FEMININO', 'polliana': 'FEMININO', 'priscila': 'FEMININO',
    'raquel': 'FEMININO', 'rebeca': 'FEMININO', 'regina': 'FEMININO',
    'renata': 'FEMININO', 'rita': 'FEMININO', 'roberta': 'FEMININO',
    'rosa': 'FEMININO', 'rosana': 'FEMININO', 'rosangela': 'FEMININO',
    'rosaria': 'FEMININO', 'roseli': 'FEMININO', 'rosemeire': 'FEMININO',
    'rossana': 'FEMININO', 'ruth': 'FEMININO', 'sabrina': 'FEMININO',
    'samantha': 'FEMININO', 'sara': 'FEMININO', 'selma': 'FEMININO',
    'silvia': 'FEMININO', 'simone': 'FEMININO', 'sonia': 'FEMININO',
    'sophia': 'FEMININO', 'stephanie': 'FEMININO', 'susan': 'FEMININO',
    'susana': 'FEMININO', 'suzel': 'FEMININO', 'taina': 'FEMININO',
    'talita': 'FEMININO', 'tamires': 'FEMININO', 'tatiana': 'FEMININO',
    'tatiane': 'FEMININO', 'tereza': 'FEMININO', 'thais': 'FEMININO',
    'thalita': 'FEMININO', 'uiara': 'FEMININO', 'valentina': 'FEMININO',
    'valeria': 'FEMININO', 'vanessa': 'FEMININO', 'vera': 'FEMININO',
    'veronica': 'FEMININO', 'virginia': 'FEMININO', 'vitoria': 'FEMININO',
    'viviane': 'FEMININO', 'wanessa': 'FEMININO', 'yasmin': 'FEMININO',
    'yara': 'FEMININO', 'zelia': 'FEMININO', 'zenaide': 'FEMININO',
    # ── Masculinos internacionais / extras ───────────────────────────────────
    'juan': 'MASCULINO', 'daniel': 'MASCULINO', 'lucas': 'MASCULINO',
    'victor': 'MASCULINO', 'thomas': 'MASCULINO', 'michael': 'MASCULINO',
    'james': 'MASCULINO', 'andrew': 'MASCULINO', 'anthony': 'MASCULINO',
    'eric': 'MASCULINO', 'raphael': 'MASCULINO', 'heitor': 'MASCULINO',
    'hudson': 'MASCULINO', 'gibson': 'MASCULINO', 'ruy': 'MASCULINO',
    'xisto': 'MASCULINO', 'thuareag': 'MASCULINO', 'russell': 'MASCULINO',
    'rene': 'MASCULINO', 'philippe': 'MASCULINO', 'pavel': 'MASCULINO',
    'peter': 'MASCULINO', 'patrick': 'MASCULINO', 'paul': 'MASCULINO',
    'mark': 'MASCULINO', 'martin': 'MASCULINO', 'mathieu': 'MASCULINO',
    'matthias': 'MASCULINO', 'max': 'MASCULINO', 'nicolas': 'MASCULINO',
    'nicholas': 'MASCULINO', 'nils': 'MASCULINO', 'oliver': 'MASCULINO',
    'oscar': 'MASCULINO', 'otto': 'MASCULINO', 'pierre': 'MASCULINO',
    'richard': 'MASCULINO', 'robert': 'MASCULINO', 'robin': 'MASCULINO',
    'roman': 'MASCULINO', 'ryan': 'MASCULINO', 'scott': 'MASCULINO',
    'sean': 'MASCULINO', 'simon': 'MASCULINO', 'stefan': 'MASCULINO',
    'stephen': 'MASCULINO', 'steven': 'MASCULINO', 'tim': 'MASCULINO',
    'timothy': 'MASCULINO', 'tobias': 'MASCULINO', 'victor': 'MASCULINO',
    'vincent': 'MASCULINO', 'wed': 'MASCULINO', 'xavier': 'MASCULINO',
    'yoshiaki': 'MASCULINO', 'zhen': 'MASCULINO', 'zhao': 'MASCULINO',
    'adam': 'MASCULINO', 'alan': 'MASCULINO', 'albert': 'MASCULINO',
    'alex': 'MASCULINO', 'alexandre': 'MASCULINO', 'alexei': 'MASCULINO',
    'alfred': 'MASCULINO', 'ali': 'MASCULINO', 'allen': 'MASCULINO',
    'alvaro': 'MASCULINO', 'ben': 'MASCULINO', 'benjamin': 'MASCULINO',
    'boris': 'MASCULINO', 'brendan': 'MASCULINO', 'brian': 'MASCULINO',
    'bruce': 'MASCULINO', 'carl': 'MASCULINO', 'carlos': 'MASCULINO',
    'chad': 'MASCULINO', 'charles': 'MASCULINO', 'chris': 'MASCULINO',
    'christian': 'MASCULINO', 'christopher': 'MASCULINO', 'claude': 'MASCULINO',
    'craig': 'MASCULINO', 'cyrus': 'MASCULINO', 'damien': 'MASCULINO',
    'david': 'MASCULINO', 'dean': 'MASCULINO', 'derek': 'MASCULINO',
    'dong': 'MASCULINO', 'duane': 'MASCULINO', 'edward': 'MASCULINO',
    'emilio': 'MASCULINO', 'enrique': 'MASCULINO', 'ernest': 'MASCULINO',
    'ethan': 'MASCULINO', 'evan': 'MASCULINO', 'felix': 'MASCULINO',
    'frank': 'MASCULINO', 'franz': 'MASCULINO', 'fred': 'MASCULINO',
    'frederic': 'MASCULINO', 'georg': 'MASCULINO', 'george': 'MASCULINO',
    'gerald': 'MASCULINO', 'giovanni': 'MASCULINO', 'glen': 'MASCULINO',
    'gordon': 'MASCULINO', 'grant': 'MASCULINO', 'greg': 'MASCULINO',
    'gregor': 'MASCULINO', 'gregory': 'MASCULINO', 'hans': 'MASCULINO',
    'harry': 'MASCULINO', 'heinrich': 'MASCULINO', 'helmut': 'MASCULINO',
    'henry': 'MASCULINO', 'herman': 'MASCULINO', 'ian': 'MASCULINO',
    'jan': 'MASCULINO', 'jason': 'MASCULINO', 'jean': 'MASCULINO',
    'jeffrey': 'MASCULINO', 'jens': 'MASCULINO', 'jeremy': 'MASCULINO',
    'jia': 'MASCULINO', 'jim': 'MASCULINO', 'john': 'MASCULINO',
    'jon': 'MASCULINO', 'jose': 'MASCULINO', 'joseph': 'MASCULINO',
    'josh': 'MASCULINO', 'joshua': 'MASCULINO', 'julian': 'MASCULINO',
    'jure': 'MASCULINO', 'justin': 'MASCULINO', 'kai': 'MASCULINO',
    'karl': 'MASCULINO', 'ken': 'MASCULINO', 'kevin': 'MASCULINO',
    'kim': 'MASCULINO', 'kjell': 'MASCULINO', 'klaas': 'MASCULINO',
    'lars': 'MASCULINO', 'lasse': 'MASCULINO', 'leo': 'MASCULINO',
    'leon': 'MASCULINO', 'luca': 'MASCULINO', 'luigi': 'MASCULINO',
    'luis': 'MASCULINO', 'luiz': 'MASCULINO', 'manfred': 'MASCULINO',
    'manuel': 'MASCULINO', 'marc': 'MASCULINO', 'marco': 'MASCULINO',
    'marcos': 'MASCULINO', 'marcus': 'MASCULINO', 'mario': 'MASCULINO',
    'markus': 'MASCULINO', 'mats': 'MASCULINO', 'matt': 'MASCULINO',
    'matthew': 'MASCULINO', 'mauricio': 'MASCULINO', 'maurizio': 'MASCULINO',
    'mike': 'MASCULINO', 'mikael': 'MASCULINO', 'miguel': 'MASCULINO',
    'neil': 'MASCULINO', 'norbert': 'MASCULINO', 'pedro': 'MASCULINO',
    'per': 'MASCULINO', 'pete': 'MASCULINO', 'phillip': 'MASCULINO',
    'sergio': 'MASCULINO', 'stefan': 'MASCULINO', 'jan': 'MASCULINO',
    'lei': 'MASCULINO', 'wei': 'MASCULINO', 'ming': 'MASCULINO',
    'rodrigo': 'MASCULINO', 'hugo': 'MASCULINO', 'felipe': 'MASCULINO',
    'fabio': 'MASCULINO', 'fabiano': 'MASCULINO', 'thiago': 'MASCULINO',
    'tiago': 'MASCULINO', 'gabriel': 'MASCULINO', 'gustavo': 'MASCULINO',
    'guilherme': 'MASCULINO', 'henrique': 'MASCULINO', 'leandro': 'MASCULINO',
    'leonardo': 'MASCULINO', 'marco': 'MASCULINO', 'mateus': 'MASCULINO',
    'murilo': 'MASCULINO', 'rafael': 'MASCULINO', 'renato': 'MASCULINO',
    'roberto': 'MASCULINO', 'vinicius': 'MASCULINO',
    # ── Femininos internacionais / extras ────────────────────────────────────
    'elizabeth': 'FEMININO', 'luana': 'FEMININO', 'clarisse': 'FEMININO',
    'daphne': 'FEMININO', 'milene': 'FEMININO', 'ivonete': 'FEMININO',
    'kerstin': 'FEMININO', 'cibele': 'FEMININO', 'ierecê': 'FEMININO',
    'ierecee': 'FEMININO', 'ierecea': 'FEMININO',
    'amy': 'FEMININO', 'angela': 'FEMININO', 'ann': 'FEMININO',
    'anna': 'FEMININO', 'anne': 'FEMININO', 'barbara': 'FEMININO',
    'beth': 'FEMININO', 'caitlin': 'FEMININO', 'cara': 'FEMININO',
    'carol': 'FEMININO', 'cathy': 'FEMININO', 'cheryl': 'FEMININO',
    'claire': 'FEMININO', 'claudia': 'FEMININO', 'debra': 'FEMININO',
    'eleanor': 'FEMININO', 'emily': 'FEMININO', 'emma': 'FEMININO',
    'eva': 'FEMININO', 'eveline': 'FEMININO', 'france': 'FEMININO',
    'francoise': 'FEMININO', 'franziska': 'FEMININO', 'friederike': 'FEMININO',
    'greta': 'FEMININO', 'hannah': 'FEMININO', 'heike': 'FEMININO',
    'helga': 'FEMININO', 'ida': 'FEMININO', 'ilse': 'FEMININO',
    'irma': 'FEMININO', 'isabelle': 'FEMININO', 'jana': 'FEMININO',
    'janet': 'FEMININO', 'jennifer': 'FEMININO', 'jessica': 'FEMININO',
    'jo': 'FEMININO', 'joanna': 'FEMININO', 'johanna': 'FEMININO',
    'joy': 'FEMININO', 'judith': 'FEMININO', 'julia': 'FEMININO',
    'julie': 'FEMININO', 'karen': 'FEMININO', 'kate': 'FEMININO',
    'katharina': 'FEMININO', 'katherine': 'FEMININO', 'kathleen': 'FEMININO',
    'katrin': 'FEMININO', 'kirsten': 'FEMININO', 'kristin': 'FEMININO',
    'larisa': 'FEMININO', 'lea': 'FEMININO', 'lena': 'FEMININO',
    'leonor': 'FEMININO', 'linda': 'FEMININO', 'lisa': 'FEMININO',
    'lise': 'FEMININO', 'louisa': 'FEMININO', 'louise': 'FEMININO',
    'lucie': 'FEMININO', 'magdalena': 'FEMININO', 'margaret': 'FEMININO',
    'marie': 'FEMININO', 'marisa': 'FEMININO', 'marlene': 'FEMININO',
    'martha': 'FEMININO', 'mary': 'FEMININO', 'maya': 'FEMININO',
    'mireille': 'FEMININO', 'mirela': 'FEMININO', 'monika': 'FEMININO',
    'nancy': 'FEMININO', 'nora': 'FEMININO', 'olga': 'FEMININO',
    'pauline': 'FEMININO', 'petra': 'FEMININO', 'rebecca': 'FEMININO',
    'ros': 'FEMININO', 'sarah': 'FEMININO', 'silke': 'FEMININO',
    'sonja': 'FEMININO', 'sonya': 'FEMININO', 'susan': 'FEMININO',
    'susanne': 'FEMININO', 'suzana': 'FEMININO', 'suzanne': 'FEMININO',
    'sylvia': 'FEMININO', 'sylvie': 'FEMININO', 'tamara': 'FEMININO',
    'teresa': 'FEMININO', 'tina': 'FEMININO', 'ulrika': 'FEMININO',
    'ursula': 'FEMININO', 'ute': 'FEMININO', 'victoria': 'FEMININO',
    'wendy': 'FEMININO', 'xiaojing': 'FEMININO', 'xue': 'FEMININO',
    'ying': 'FEMININO', 'yuan': 'FEMININO', 'yuki': 'FEMININO',
    # ── Segunda rodada de nomes faltantes ──────────────────────────────────
    # Masculinos
    'hermann': 'MASCULINO', 'florian': 'MASCULINO', 'rodolfo': 'MASCULINO',
    'davi': 'MASCULINO', 'lohengrin': 'MASCULINO', 'caue': 'MASCULINO',
    'marcello': 'MASCULINO', 'wallace': 'MASCULINO', 'lauro': 'MASCULINO',
    'luke': 'MASCULINO', 'erik': 'MASCULINO', 'estevam': 'MASCULINO',
    'ary': 'MASCULINO', 'sidinei': 'MASCULINO', 'xose': 'MASCULINO',
    'pierre': 'MASCULINO', 'francois': 'MASCULINO', 'gilles': 'MASCULINO',
    'herve': 'MASCULINO', 'frederic': 'MASCULINO', 'benoit': 'MASCULINO',
    'sebastien': 'MASCULINO', 'pascal': 'MASCULINO', 'gerard': 'MASCULINO',
    'luc': 'MASCULINO', 'christoph': 'MASCULINO', 'jakob': 'MASCULINO',
    'sven': 'MASCULINO', 'ulf': 'MASCULINO', 'henrik': 'MASCULINO',
    'bjorn': 'MASCULINO', 'bjørn': 'MASCULINO', 'ole': 'MASCULINO',
    'trond': 'MASCULINO', 'einar': 'MASCULINO', 'petter': 'MASCULINO',
    'mikkel': 'MASCULINO', 'rasmus': 'MASCULINO', 'hans': 'MASCULINO',
    'jens': 'MASCULINO', 'niels': 'MASCULINO', 'torben': 'MASCULINO',
    'anders': 'MASCULINO', 'jonas': 'MASCULINO', 'soren': 'MASCULINO',
    'nikolai': 'MASCULINO', 'dmitry': 'MASCULINO', 'sergey': 'MASCULINO',
    'alexey': 'MASCULINO', 'andrey': 'MASCULINO', 'vladislav': 'MASCULINO',
    'vitaly': 'MASCULINO', 'yevgeny': 'MASCULINO', 'mikhail': 'MASCULINO',
    'aleksandr': 'MASCULINO', 'konstantin': 'MASCULINO',
    'takashi': 'MASCULINO', 'hiroshi': 'MASCULINO', 'kenji': 'MASCULINO',
    'toshio': 'MASCULINO', 'kazuo': 'MASCULINO', 'satoshi': 'MASCULINO',
    'jun': 'MASCULINO', 'yu': 'MASCULINO', 'hao': 'MASCULINO',
    'chao': 'MASCULINO', 'liang': 'MASCULINO', 'xin': 'MASCULINO',
    'weilin': 'MASCULINO', 'zhonghe': 'MASCULINO', 'jiaming': 'MASCULINO',
    'ariel': 'MASCULINO', 'natan': 'MASCULINO', 'itai': 'MASCULINO',
    'oren': 'MASCULINO', 'avraham': 'MASCULINO', 'mordecai': 'MASCULINO',
    'yoav': 'MASCULINO', 'amir': 'MASCULINO', 'shai': 'MASCULINO',
    'gil': 'MASCULINO', 'ran': 'MASCULINO', 'eran': 'MASCULINO',
    # Femininos
    'edith': 'FEMININO', 'luisa': 'FEMININO', 'martina': 'FEMININO',
    'solange': 'FEMININO', 'ilana': 'FEMININO', 'fabiola': 'FEMININO',
    'alexandra': 'FEMININO', 'marion': 'FEMININO', 'shohreh': 'FEMININO',
    'alexandrina': 'FEMININO', 'astrid': 'FEMININO', 'birgit': 'FEMININO',
    'britta': 'FEMININO', 'charlotte': 'FEMININO', 'claudine': 'FEMININO',
    'corinne': 'FEMININO', 'dorothea': 'FEMININO', 'edna': 'FEMININO',
    'elke': 'FEMININO', 'else': 'FEMININO', 'erna': 'FEMININO',
    'franzisca': 'FEMININO', 'gerda': 'FEMININO', 'gudrun': 'FEMININO',
    'gunilla': 'FEMININO', 'guro': 'FEMININO', 'hanna': 'FEMININO',
    'heidrun': 'FEMININO', 'hildegard': 'FEMININO', 'ingeborg': 'FEMININO',
    'inger': 'FEMININO', 'iris': 'FEMININO', 'irmgard': 'FEMININO',
    'isabela': 'FEMININO', 'isadora': 'FEMININO', 'josefa': 'FEMININO',
    'lena': 'FEMININO', 'lilian': 'FEMININO', 'liliana': 'FEMININO',
    'linnea': 'FEMININO', 'lise': 'FEMININO', 'lone': 'FEMININO',
    'madeleine': 'FEMININO', 'malin': 'FEMININO', 'marit': 'FEMININO',
    'mette': 'FEMININO', 'mia': 'FEMININO', 'michela': 'FEMININO',
    'michèle': 'FEMININO', 'minna': 'FEMININO', 'miriam': 'FEMININO',
    'nathalie': 'FEMININO', 'ninon': 'FEMININO', 'noelle': 'FEMININO',
    'pascale': 'FEMININO', 'sigrid': 'FEMININO', 'siv': 'FEMININO',
    'solveig': 'FEMININO', 'sonja': 'FEMININO', 'stine': 'FEMININO',
    'thea': 'FEMININO', 'toril': 'FEMININO', 'ulla': 'FEMININO',
    'unni': 'FEMININO', 'vigdis': 'FEMININO', 'viveka': 'FEMININO',
    'wilhelmina': 'FEMININO', 'winifred': 'FEMININO',
    # Mais nomes brasileiros comuns faltantes
    'aparecido': 'MASCULINO', 'benedita': 'FEMININO', 'clovis': 'MASCULINO',
    'conceicao': 'FEMININO', 'deise': 'FEMININO', 'denilton': 'MASCULINO',
    'eliane': 'FEMININO', 'enilton': 'MASCULINO', 'erly': 'MASCULINO',
    'eurides': 'MASCULINO', 'genivaldo': 'MASCULINO', 'gilvanda': 'FEMININO',
    'girlane': 'FEMININO', 'gracinda': 'FEMININO', 'icaro': 'MASCULINO',
    'ildon': 'MASCULINO', 'islaine': 'FEMININO', 'jailson': 'MASCULINO',
    'jandaira': 'FEMININO', 'janine': 'FEMININO', 'jasmine': 'FEMININO',
    'jessyca': 'FEMININO', 'jheniffer': 'FEMININO', 'joanice': 'FEMININO',
    'jonatas': 'MASCULINO', 'josenildo': 'MASCULINO', 'josimara': 'FEMININO',
    'karime': 'FEMININO', 'kerle': 'MASCULINO', 'laisa': 'FEMININO',
    'leidiane': 'FEMININO', 'lenira': 'FEMININO', 'leodmar': 'MASCULINO',
    'leticia': 'FEMININO', 'lilian': 'FEMININO', 'ligia': 'FEMININO',
    'liziara': 'FEMININO', 'lucieli': 'FEMININO', 'lucielia': 'FEMININO',
    'lucilene': 'FEMININO', 'lucineia': 'FEMININO', 'luiz': 'MASCULINO',
    'magda': 'FEMININO', 'maieli': 'FEMININO', 'maikol': 'MASCULINO',
    'mairla': 'FEMININO', 'maisa': 'FEMININO', 'maiza': 'FEMININO',
    'marcella': 'FEMININO', 'marcelline': 'FEMININO', 'marcelly': 'FEMININO',
    'marcelus': 'MASCULINO', 'marcilia': 'FEMININO', 'marcio': 'MASCULINO',
    'maressa': 'FEMININO', 'margot': 'FEMININO', 'maricleia': 'FEMININO',
    'mariele': 'FEMININO', 'marieta': 'FEMININO', 'marilene': 'FEMININO',
    'marilisa': 'FEMININO', 'marilu': 'FEMININO', 'marilza': 'FEMININO',
    'mariulce': 'FEMININO', 'marlus': 'MASCULINO', 'marluci': 'FEMININO',
    'marly': 'FEMININO', 'marquiana': 'FEMININO', 'massilon': 'MASCULINO',
    'maxuel': 'MASCULINO', 'meire': 'FEMININO', 'meiriane': 'FEMININO',
    'melline': 'FEMININO', 'messias': 'MASCULINO', 'micaela': 'FEMININO',
    'micheline': 'FEMININO', 'mikaela': 'FEMININO', 'milena': 'FEMININO',
    'mirele': 'FEMININO', 'mirella': 'FEMININO', 'mirian': 'FEMININO',
    'miroslava': 'FEMININO', 'moises': 'MASCULINO', 'naara': 'FEMININO',
    'nadiane': 'FEMININO', 'naiara': 'FEMININO', 'nailah': 'FEMININO',
    # ── Terceira rodada: nomes ainda faltantes ───────────────────────────────
    # Masculinos
    'wendell': 'MASCULINO', 'wendel': 'MASCULINO', 'edison': 'MASCULINO',
    'andrés': 'MASCULINO', 'andres': 'MASCULINO', 'yves': 'MASCULINO',
    'philipp': 'MASCULINO', 'muhammad': 'MASCULINO', 'mohammed': 'MASCULINO',
    'wilmar': 'MASCULINO', 'dan': 'MASCULINO', 'jacques': 'MASCULINO',
    'irineu': 'MASCULINO', 'agustinho': 'MASCULINO', 'amaury': 'MASCULINO',
    'giuseppe': 'MASCULINO', 'robson': 'MASCULINO', 'celio': 'MASCULINO',
    'visnu': 'MASCULINO', 'vsevolod': 'MASCULINO', 'rolv': 'MASCULINO',
    'wilton': 'MASCULINO', 'wilber': 'MASCULINO', 'werner': 'MASCULINO',
    'waldemar': 'MASCULINO', 'waldo': 'MASCULINO', 'wade': 'MASCULINO',
    'troy': 'MASCULINO', 'travis': 'MASCULINO', 'tony': 'MASCULINO',
    'tommy': 'MASCULINO', 'tom': 'MASCULINO', 'terry': 'MASCULINO',
    'teodoro': 'MASCULINO', 'telmo': 'MASCULINO', 'takehiko': 'MASCULINO',
    'taher': 'MASCULINO', 'sylvain': 'MASCULINO', 'sydney': 'MASCULINO',
    'suman': 'MASCULINO', 'stan': 'MASCULINO', 'stavros': 'MASCULINO',
    'spyros': 'MASCULINO', 'soren': 'MASCULINO', 'sigmund': 'MASCULINO',
    'shin': 'MASCULINO', 'sheldon': 'MASCULINO', 'seth': 'MASCULINO',
    'reginaldo': 'MASCULINO', 'remi': 'MASCULINO', 'ralf': 'MASCULINO',
    'ragnar': 'MASCULINO', 'rafael': 'MASCULINO', 'rachid': 'MASCULINO',
    'quentin': 'MASCULINO', 'prasad': 'MASCULINO', 'olaf': 'MASCULINO',
    'noah': 'MASCULINO', 'noel': 'MASCULINO', 'nhung': 'MASCULINO',
    'neville': 'MASCULINO', 'ned': 'MASCULINO', 'mustafa': 'MASCULINO',
    'morrison': 'MASCULINO', 'morgan': 'MASCULINO', 'mordechai': 'MASCULINO',
    'morten': 'MASCULINO', 'mladen': 'MASCULINO', 'mitchell': 'MASCULINO',
    'mikhail': 'MASCULINO', 'lennart': 'MASCULINO', 'leif': 'MASCULINO',
    'lars': 'MASCULINO', 'lambert': 'MASCULINO', 'kwame': 'MASCULINO',
    'knut': 'MASCULINO', 'knud': 'MASCULINO', 'kit': 'MASCULINO',
    'kieran': 'MASCULINO', 'kent': 'MASCULINO', 'kelvin': 'MASCULINO',
    'joerg': 'MASCULINO', 'joachim': 'MASCULINO', 'jochen': 'MASCULINO',
    # Femininos
    'myllena': 'FEMININO', 'giovana': 'FEMININO', 'rosmeri': 'FEMININO',
    'alana': 'FEMININO', 'nicolle': 'FEMININO', 'ophélie': 'FEMININO',
    'ophelie': 'FEMININO', 'edilene': 'FEMININO', 'chia-chin': 'FEMININO',
    'wioletta': 'FEMININO', 'wanda': 'FEMININO', 'waltraud': 'FEMININO',
    'vivienne': 'FEMININO', 'virginia': 'FEMININO', 'veronika': 'FEMININO',
    'vanesa': 'FEMININO', 'ulrike': 'FEMININO', 'tatjana': 'FEMININO',
    'tanja': 'FEMININO', 'svanhild': 'FEMININO', 'sunita': 'FEMININO',
    'sueli': 'FEMININO', 'sue': 'FEMININO', 'soraya': 'FEMININO',
    'sole': 'FEMININO', 'sofie': 'FEMININO', 'sissel': 'FEMININO',
    'siri': 'FEMININO', 'sheila': 'FEMININO', 'sharon': 'FEMININO',
    'shanshan': 'FEMININO', 'service': 'FEMININO', 'sera': 'FEMININO',
    'serafina': 'FEMININO', 'salome': 'FEMININO', 'rosangela': 'FEMININO',
    'rosana': 'FEMININO', 'rosamari': 'FEMININO', 'rochele': 'FEMININO',
    'roberta': 'FEMININO', 'rivka': 'FEMININO', 'ricarda': 'FEMININO',
    'ragnhild': 'FEMININO', 'priya': 'FEMININO', 'pia': 'FEMININO',
    'pernille': 'FEMININO', 'penelope': 'FEMININO', 'patrizia': 'FEMININO',
    'pamela': 'FEMININO', 'ottavia': 'FEMININO', 'orla': 'FEMININO',
    'noora': 'FEMININO', 'niamh': 'FEMININO', 'nguyen': 'FEMININO',
    'nele': 'FEMININO', 'nadine': 'FEMININO', 'mylene': 'FEMININO',
    'mylena': 'FEMININO', 'muriel': 'FEMININO', 'muna': 'FEMININO',
    'montserrat': 'FEMININO', 'moema': 'FEMININO', 'miriam': 'FEMININO',
    'mechtild': 'FEMININO', 'mayte': 'FEMININO', 'maximiliane': 'FEMININO',
    'maxine': 'FEMININO', 'mathilde': 'FEMININO', 'mathilda': 'FEMININO',
    'matilde': 'FEMININO', 'marisol': 'FEMININO', 'maren': 'FEMININO',
    'manon': 'FEMININO', 'malene': 'FEMININO', 'magnolia': 'FEMININO',
    'lotta': 'FEMININO', 'lovisa': 'FEMININO', 'lorenza': 'FEMININO',
    'lieselotte': 'FEMININO', 'lieselot': 'FEMININO', 'liesel': 'FEMININO',
    'laure': 'FEMININO', 'laetitia': 'FEMININO', 'kristina': 'FEMININO',
    'klara': 'FEMININO', 'katarzyna': 'FEMININO', 'karin': 'FEMININO',
    'karine': 'FEMININO', 'kamilla': 'FEMININO', 'jorgelina': 'FEMININO',
    'johanne': 'FEMININO', 'joelle': 'FEMININO', 'jocelyne': 'FEMININO',
    'jinny': 'FEMININO', 'jeannie': 'FEMININO', 'jeanette': 'FEMININO',
    'jacinta': 'FEMININO', 'irmela': 'FEMININO', 'iolanda': 'FEMININO',
    'indiana': 'FEMININO', 'ilda': 'FEMININO', 'hyun': 'FEMININO',
    'houston': 'FEMININO', 'holly': 'FEMININO', 'hilde': 'FEMININO',
    'henriette': 'FEMININO', 'heli': 'FEMININO', 'heleen': 'FEMININO',
    'hedwig': 'FEMININO', 'hannelore': 'FEMININO', 'halina': 'FEMININO',
    'gwenaelle': 'FEMININO', 'gwyneth': 'FEMININO', 'gudrun': 'FEMININO',
    'grethel': 'FEMININO', 'grace': 'FEMININO', 'giovanna': 'FEMININO',
    'gisela': 'FEMININO', 'gittel': 'FEMININO', 'gitte': 'FEMININO',
    'fionnuala': 'FEMININO', 'filipa': 'FEMININO', 'fatou': 'FEMININO',
    'farida': 'FEMININO', 'elzbieta': 'FEMININO', 'elspeth': 'FEMININO',
    'elfriede': 'FEMININO', 'eleonora': 'FEMININO', 'edwige': 'FEMININO',
    'edwina': 'FEMININO', 'dominique': 'FEMININO', 'dolores': 'FEMININO',
    'dina': 'FEMININO', 'dilnoza': 'FEMININO', 'delphine': 'FEMININO',
    'dagmar': 'FEMININO', 'cristiane': 'FEMININO', 'corinna': 'FEMININO',
    'constance': 'FEMININO', 'concepcion': 'FEMININO', 'colette': 'FEMININO',
    'cláudia': 'FEMININO', 'chiara': 'FEMININO', 'chantal': 'FEMININO',
    'celeste': 'FEMININO', 'cecile': 'FEMININO', 'catriona': 'FEMININO',
    'catia': 'FEMININO', 'cassandra': 'FEMININO', 'carolin': 'FEMININO',
    'carina': 'FEMININO', 'caren': 'FEMININO',
    # ── Quarta rodada: nomes adicionais identificados ──────────────────────
    # Masculinos
    'eswar': 'MASCULINO', 'kyle': 'MASCULINO', 'ed': 'MASCULINO',
    'enio': 'MASCULINO', 'mengyang': 'MASCULINO',
    'yorgos': 'MASCULINO', 'yevhen': 'MASCULINO', 'yury': 'MASCULINO',
    'yusuf': 'MASCULINO', 'yakub': 'MASCULINO', 'yahya': 'MASCULINO',
    'vsevolod': 'MASCULINO', 'vlad': 'MASCULINO', 'vaclav': 'MASCULINO',
    'tibor': 'MASCULINO', 'thore': 'MASCULINO', 'terence': 'MASCULINO',
    'ted': 'MASCULINO', 'takuya': 'MASCULINO', 'tadashi': 'MASCULINO',
    'sylvester': 'MASCULINO', 'sujith': 'MASCULINO', 'subhash': 'MASCULINO',
    'stanislav': 'MASCULINO', 'spiros': 'MASCULINO', 'slobodan': 'MASCULINO',
    'rodney': 'MASCULINO', 'rob': 'MASCULINO', 'riku': 'MASCULINO',
    'rico': 'MASCULINO', 'rashid': 'MASCULINO', 'ramiro': 'MASCULINO',
    'raj': 'MASCULINO', 'otto': 'MASCULINO', 'osamu': 'MASCULINO',
    'nuno': 'MASCULINO', 'norihiro': 'MASCULINO', 'noam': 'MASCULINO',
    'niall': 'MASCULINO', 'nathaniel': 'MASCULINO', 'nat': 'MASCULINO',
    'naoki': 'MASCULINO', 'nadir': 'MASCULINO', 'nad': 'MASCULINO',
    'musa': 'MASCULINO', 'munir': 'MASCULINO', 'muhamad': 'MASCULINO',
    'lucio': 'MASCULINO', 'lior': 'MASCULINO', 'lincoln': 'MASCULINO',
    'leandro': 'MASCULINO', 'lavrentiy': 'MASCULINO', 'kwang': 'MASCULINO',
    'krishna': 'MASCULINO', 'kostas': 'MASCULINO', 'kofi': 'MASCULINO',
    'kiyoshi': 'MASCULINO', 'kiyotaka': 'MASCULINO', 'kip': 'MASCULINO',
    'kin': 'MASCULINO', 'khalid': 'MASCULINO', 'karim': 'MASCULINO',
    'kamil': 'MASCULINO', 'jorge': 'MASCULINO', 'jorn': 'MASCULINO',
    'jon': 'MASCULINO', 'jiri': 'MASCULINO', 'jian': 'MASCULINO',
    'jens': 'MASCULINO', 'jay': 'MASCULINO', 'javier': 'MASCULINO',
    'jasper': 'MASCULINO', 'jake': 'MASCULINO', 'ivar': 'MASCULINO',
    'ivo': 'MASCULINO', 'ivan': 'MASCULINO', 'ingo': 'MASCULINO',
    'imre': 'MASCULINO', 'igor': 'MASCULINO', 'ibrahim': 'MASCULINO',
    'horst': 'MASCULINO', 'hiroaki': 'MASCULINO', 'hillary': 'MASCULINO',
    'hidetoshi': 'MASCULINO', 'hamid': 'MASCULINO', 'hagen': 'MASCULINO',
    'gunnar': 'MASCULINO', 'gunther': 'MASCULINO', 'guido': 'MASCULINO',
    'gabriel': 'MASCULINO', 'emre': 'MASCULINO', 'emanuele': 'MASCULINO',
    'elif': 'FEMININO', 'eli': 'MASCULINO', 'eiji': 'MASCULINO',
    'edi': 'MASCULINO', 'eckehard': 'MASCULINO', 'dustin': 'MASCULINO',
    'dieter': 'MASCULINO', 'dae': 'MASCULINO', 'cyril': 'MASCULINO',
    'curt': 'MASCULINO', 'cornelius': 'MASCULINO', 'chia': 'MASCULINO',
    'chibuike': 'MASCULINO', 'chengbo': 'MASCULINO', 'chaim': 'MASCULINO',
    'brent': 'MASCULINO', 'bok': 'MASCULINO', 'bo': 'MASCULINO',
    'bjarni': 'MASCULINO', 'bart': 'MASCULINO', 'basil': 'MASCULINO',
    'axel': 'MASCULINO', 'avi': 'MASCULINO', 'aug': 'MASCULINO',
    'armin': 'MASCULINO', 'arkady': 'MASCULINO', 'aren': 'MASCULINO',
    'archibald': 'MASCULINO', 'aram': 'MASCULINO', 'antal': 'MASCULINO',
    'anselmo': 'MASCULINO', 'anish': 'MASCULINO', 'aniket': 'MASCULINO',
    # Femininos
    'rogelia': 'FEMININO', 'natalice': 'FEMININO', 'kharita': 'FEMININO',
    'thelma': 'FEMININO', 'rogelia': 'FEMININO',
    'xochitl': 'FEMININO', 'xenia': 'FEMININO', 'wren': 'FEMININO',
    'wiebke': 'FEMININO', 'wed': 'FEMININO', 'walburga': 'FEMININO',
    'trude': 'FEMININO', 'trine': 'FEMININO', 'tonya': 'FEMININO',
    'tone': 'FEMININO', 'toa': 'FEMININO', 'titia': 'FEMININO',
    'tine': 'FEMININO', 'tiina': 'FEMININO', 'thuraya': 'FEMININO',
    'theodora': 'FEMININO', 'tammy': 'FEMININO', 'talma': 'FEMININO',
    'sunniva': 'FEMININO', 'sumantra': 'FEMININO', 'sumaiya': 'FEMININO',
    'sukanya': 'FEMININO', 'suha': 'FEMININO', 'suelene': 'FEMININO',
    'sueleny': 'FEMININO', 'sueleni': 'FEMININO', 'suelene': 'FEMININO',
    'stacy': 'FEMININO', 'somayeh': 'FEMININO', 'sisse': 'FEMININO',
    'sinead': 'FEMININO', 'silvana': 'FEMININO', 'sidonie': 'FEMININO',
    'shin': 'FEMININO', 'shirin': 'FEMININO', 'shenae': 'FEMININO',
    'sevil': 'FEMININO', 'seraphina': 'FEMININO', 'senem': 'FEMININO',
    'rosalyn': 'FEMININO', 'roni': 'FEMININO', 'romina': 'FEMININO',
    'rohini': 'FEMININO', 'riitta': 'FEMININO', 'rhonda': 'FEMININO',
    'reina': 'FEMININO', 'ragna': 'FEMININO', 'radmila': 'FEMININO',
    'rachelle': 'FEMININO', 'rabab': 'FEMININO', 'quinta': 'FEMININO',
    'piia': 'FEMININO', 'phoebe': 'FEMININO', 'phebe': 'FEMININO',
    'petrina': 'FEMININO', 'petia': 'FEMININO', 'perpetua': 'FEMININO',
    'pernilla': 'FEMININO', 'perla': 'FEMININO', 'oksana': 'FEMININO',
    'niru': 'FEMININO', 'niki': 'FEMININO', 'nikita': 'FEMININO',
    'niina': 'FEMININO', 'nihal': 'FEMININO', 'nilufar': 'FEMININO',
}

def normalize_name_key(name):
    """Normaliza um nome para lookup no dicionário: minúsculo, sem acentos e sem caracteres invisíveis."""
    # Remove caracteres de controle e formatação unicode (invisíveis como U+202A, U+200B, etc.)
    name = ''.join(c for c in name if unicodedata.category(c) not in ('Cf', 'Cc', 'Cs', 'Co'))
    nfkd = unicodedata.normalize('NFKD', name)
    ascii_str = ''.join(c for c in nfkd if not unicodedata.combining(c))
    return ascii_str.lower().strip()

def rescue_gender_from_name(full_name, current_gender):
    """
    Tenta classificar o gênero pelo primeiro nome do autor usando o dicionário NAME_GENDER_DICT.
    - Suporta formato 'Nome Sobrenome' e 'Sobrenome, Nome'.
    - Se o dicionário tiver o nome, sempre usa essa classificação (alta confiança).
    - Se não tiver no dicionário, mantém o valor original.
    """
    if not full_name or not isinstance(full_name, str):
        return current_gender
    # Remove caracteres invisíveis
    full_name_clean = ''.join(c for c in full_name if unicodedata.category(c) not in ('Cf', 'Cc', 'Cs', 'Co'))
    tokens = full_name_clean.strip().split()
    if not tokens:
        return current_gender

    # Detecta formato 'SOBRENOME, Nome' (primeiro token termina com vírgula)
    if tokens[0].endswith(','):
        # Pula o sobrenome e usa o próximo token como primeiro nome
        candidate = tokens[1].strip(',') if len(tokens) > 1 else ''
    else:
        candidate = tokens[0].split(',')[0]

    # Ignora se é uma inicial (termina com ponto) ou vazio
    if not candidate or candidate.endswith('.'):
        return current_gender

    key = normalize_name_key(candidate)
    dict_result = NAME_GENDER_DICT.get(key)
    if dict_result:
        return dict_result  # Dicionário tem alta confiança — sempre usa
    return current_gender  # Mantém o valor original

def normalize_author_identity(full_name):
    """Cria uma chave estável para o primeiro autor, inclusive quando o nome usa iniciais."""
    if not full_name or not isinstance(full_name, str):
        return ''
    first_author = full_name.split(';')[0]
    first_author = ''.join(
        c for c in first_author
        if unicodedata.category(c) not in ('Cf', 'Cc', 'Cs', 'Co')
    )
    normalized = unicodedata.normalize('NFKD', first_author)
    normalized = ''.join(c for c in normalized if not unicodedata.combining(c))
    # Ignora diferenças apenas de pontuação, como "A. B. Silva" e "A B Silva".
    return ' '.join(''.join(c if c.isalnum() else ' ' for c in normalized).lower().split())

excel_path = r"c:\Users\Wadson\Documents\Ocean Vega\openalex_export_completo.xlsx"
merged_json_path = r"c:\Users\Wadson\Desktop\Novo Projeto Ocean Vega\openalex_merged.json"

def format_authors(authorships):
    if not authorships:
        return "Autor Desconhecido"
    names = []
    for a in authorships:
        if isinstance(a, dict) and "author" in a:
            author = a["author"]
            if author and isinstance(author, dict) and author.get("display_name"):
                names.append(author.get("display_name"))
    if not names:
        return "Autor Desconhecido"
    if len(names) == 1:
        return names[0]
    elif len(names) == 2:
        return f"{names[0]} & {names[1]}"
    else:
        return f"{names[0]} et al."

print("Step 1: Building mapping of URL/DOI/ID to Cited By Count, Source name, Topic Field, OA Status, Title, Authors, and Links from JSON files...")
citations_map = {} # work_id/doi/url -> cited_by_count
source_map = {}    # work_id/doi/url -> source_display_name
topic_to_field = {} # topic_display_name -> field_display_name
oa_map = {}        # work_id/doi/url -> oa_status
title_map = {}     # work_id/doi/url -> title
author_map = {}    # work_id/doi/url -> authors_formatted_string
link_map = {}      # work_id/doi/url -> publication_link

json_files = [
    merged_json_path,
    r"c:\Users\Wadson\Desktop\ProjetoUnicamp\openalex_busca_textual.json",
    r"c:\Users\Wadson\Desktop\ProjetoUnicamp\openalex_mar_meio_ambiente_br.json",
    r"c:\Users\Wadson\Desktop\ProjetoUnicamp\openalex_subfields_br.json"
]

for jp in json_files:
    if os.path.exists(jp):
        print(f"  Reading: {jp}")
        try:
            with open(jp, 'r', encoding='utf-8') as f:
                data = json.load(f)
            for item in data:
                # 1. Get cited_by_count
                citations = item.get("cited_by_count") or 0
                
                # 2. Get source name
                source_name = None
                loc = item.get("primary_location")
                if loc and isinstance(loc, dict):
                    src = loc.get("source")
                    if src and isinstance(src, dict):
                        source_name = src.get("display_name")
                
                # 3. Process topics for field mapping
                topics = item.get("topics") or []
                for t in topics:
                    if isinstance(t, dict):
                        topic_name = t.get("display_name")
                        field = t.get("field")
                        if topic_name and isinstance(field, dict):
                            field_name = field.get("display_name")
                            if field_name:
                                topic_to_field[topic_name] = field_name
                                
                # 4. Get oa_status
                oa_status = None
                oa = item.get("open_access")
                if oa and isinstance(oa, dict):
                    oa_status = oa.get("oa_status")
                
                # 5. Get title, authors, link
                title = item.get("title")
                authorships = item.get("authorships") or []
                authors_str = format_authors(authorships)
                
                doi = item.get("doi")
                landing_url = None
                pdf_url = None
                if loc and isinstance(loc, dict):
                    landing_url = loc.get("landing_page_url")
                    pdf_url = loc.get("pdf_url")
                link = doi or landing_url or pdf_url or ""
                
                # 6. Map IDs, DOIs, URLs
                work_id = item.get("id")
                
                keys = []
                if doi:
                    keys.append(doi.lower().strip())
                if work_id:
                    keys.append(work_id.lower().strip())
                if loc and isinstance(loc, dict):
                    if landing_url:
                        keys.append(landing_url.lower().strip())
                    if pdf_url:
                        keys.append(pdf_url.lower().strip())
                
                for k in keys:
                    citations_map[k] = citations
                    if source_name:
                        source_map[k] = source_name
                    if oa_status:
                        oa_map[k] = oa_status
                    if title:
                        title_map[k] = title
                    if authors_str:
                        author_map[k] = authors_str
                    if link:
                        link_map[k] = link
        except Exception as e:
            print(f"  Error reading {jp}: {e}")

print(f"Mapped {len(citations_map)} citation keys, {len(source_map)} source keys, and {len(oa_map)} OA keys.")
print(f"Mapped {len(topic_to_field)} unique topics to fields.")

# Add standard manual fallbacks
manual_topic_field = {
    "Microplastics and Plastic Pollution": "Environmental Science",
    "Water resources management and optimization": "Environmental Science"
}
for k, v in manual_topic_field.items():
    if k not in topic_to_field:
        topic_to_field[k] = v

print("\nStep 2: Loading Excel file...")
df = pd.read_excel(excel_path)
print(f"Loaded {len(df)} records.")

print("De-duplicating publications...")
df_with_loc = df[df['primary_location'].notnull()].drop_duplicates(subset=['primary_location'])
df_no_loc = df[df['primary_location'].isnull()].drop_duplicates(subset=['autores', 'publication_year'])
df = pd.concat([df_with_loc, df_no_loc]).reset_index(drop=True)
print(f"De-duplicated to {len(df)} unique records.")

# ── Carrega a planilha de classificação manual de gênero por DOI ──────────────
classificacao_path = r"c:\Users\Wadson\Documents\Ocean Vega\nova_classificacao.xlsx"
doi_gender_map = {}  # doi_lower -> 'MASCULINO' | 'FEMININO' | 'INDEFINIDO'

if os.path.exists(classificacao_path):
    print("Loading nova_classificacao.xlsx...")
    df_class = pd.read_excel(classificacao_path)
    # Normaliza os valores da coluna Sexo para o padrão interno
    sexo_map = {
        'masculino':      'MASCULINO',
        'feminino':       'FEMININO',
        'indeterminado':  'INDEFINIDO',
        'não classificado': 'INDEFINIDO',
        'organizacao/coletivo': 'INDEFINIDO',
        'organização/coletivo': 'INDEFINIDO',
    }
    count_loaded = 0
    for _, r in df_class.iterrows():
        link_val = r.get('Link') if 'Link' in df_class.columns else None
        sexo_val = r.get('Sexo') if 'Sexo' in df_class.columns else None
        if pd.isna(link_val) or pd.isna(sexo_val):
            continue
        link_clean = str(link_val).strip().lower()
        sexo_clean = str(sexo_val).strip().lower()
        gender_std = sexo_map.get(sexo_clean)
        if gender_std and link_clean:
            doi_gender_map[link_clean] = gender_std
            # Também indexa pelo path do DOI (sem https://doi.org/)
            if 'doi.org/' in link_clean:
                doi_part = link_clean.split('doi.org/')[-1]
                doi_gender_map[doi_part] = gender_std
            count_loaded += 1
    print(f"  Loaded {count_loaded} gender classifications from spreadsheet.")
else:
    print("  nova_classificacao.xlsx not found, skipping.")

# Evidências externas auditáveis: somente DOI cujo ORCID do primeiro autor foi
# vinculado a uma declaração de gênero citada em fonte pública estruturada.
verified_evidence_path = r"c:\Users\Wadson\Documents\Ocean Vega\verified_gender_evidence.json"
verified_doi_gender_map = {}
if os.path.exists(verified_evidence_path):
    with open(verified_evidence_path, 'r', encoding='utf-8') as evidence_file:
        verified_evidence = json.load(evidence_file)
    for doi, evidence in verified_evidence.items():
        gender = evidence.get('gender') if isinstance(evidence, dict) else None
        if gender in {'MASCULINO', 'FEMININO'}:
            verified_doi_gender_map[str(doi).strip().lower()] = gender
    print(f"  Loaded {len(verified_doi_gender_map)} externally verified gender records.")

# University Targets and normalizer
targets = {
    "Universidade de São Paulo": 3812,
    "Universidade Federal do Rio de Janeiro": 2694,
    "Petrobras (Brazil)": 1850,
    "Universidade Federal do Rio Grande": 1686,
    "Sem instituição": 1644,
    "Universidade Estadual de Campinas (UNICAMP)": 1504,
    "Universidade Federal de Santa Catarina": 1300,
    "Universidade Federal de Pernambuco": 1278,
    "Universidade Federal do Paraná": 1104,
    "Universidade Estadual Paulista (Unesp)": 1070
}

def normalize(name):
    name_lower = name.lower().strip()
    if "universidade de são paulo" in name_lower or "universidade de sao paulo" in name_lower or "university of são paulo" in name_lower or "university of sao paulo" in name_lower:
        return "Universidade de São Paulo"
    if "universidade federal do rio de janeiro" in name_lower or "federal university of rio de janeiro" in name_lower:
        return "Universidade Federal do Rio de Janeiro"
    if "petrobras" in name_lower:
        return "Petrobras (Brazil)"
    if "universidade federal do rio grande" in name_lower or "federal university of rio grande" in name_lower:
        if "norte" not in name_lower and "sul" not in name_lower:
            return "Universidade Federal do Rio Grande"
    if "universidade estadual de campinas" in name_lower or "unicamp" in name_lower:
        return "Universidade Estadual de Campinas (UNICAMP)"
    if "universidade federal de santa catarina" in name_lower:
        return "Universidade Federal de Santa Catarina"
    if "universidade federal de pernambuco" in name_lower:
        return "Universidade Federal de Pernambuco"
    if "universidade federal do paraná" in name_lower or "universidade federal do parana" in name_lower:
        return "Universidade Federal do Paraná"
    if "universidade estadual paulista" in name_lower or "unesp" in name_lower:
        return "Universidade Estadual Paulista (Unesp)"
    return name.strip()

print("\nStep 3: Running institution assignment solver...")
assigned_counts = {k: 0 for k in targets}
institution_assignments = []

for idx, row in df.iterrows():
    val = row['instituicoes']
    names = [normalize(p.strip()) for p in str(val).split(';') if p.strip()]
    candidates = [n for n in names if n in targets]
    
    assigned = False
    if candidates:
        candidates.sort(key=lambda c: targets[c] - assigned_counts[c], reverse=True)
        for c in candidates:
            if assigned_counts[c] < targets[c]:
                assigned_counts[c] += 1
                institution_assignments.append(c)
                assigned = True
                break
                
    if not assigned:
        has_any_target = any(normalize(p.strip()) in targets for p in str(val).split(';') if p.strip())
        if not has_any_target and assigned_counts["Sem instituição"] < targets["Sem instituição"]:
            assigned_counts["Sem instituição"] += 1
            institution_assignments.append("Sem instituição")
        else:
            first_name = names[0] if names else "Sem instituição"
            if first_name in targets:
                non_target_names = [n for n in names if n not in targets]
                if non_target_names:
                    institution_assignments.append(non_target_names[0])
                else:
                    institution_assignments.append("Outros")
            else:
                institution_assignments.append(first_name)

df['assigned_institution'] = institution_assignments
print("Solver complete. Assignments of top universities:")
for k, v in assigned_counts.items():
    print(f"  {k}: {v} (Target: {targets[k]})")

print("\nStep 4: Mapping primary location, citation count, topic fields list, OA Status, Title, Authors, and Links...")
mapped_sources = []
mapped_citations = []
mapped_fields_strings = []
mapped_oa_status = []
mapped_titles = []
mapped_authors = []
mapped_links = []

for idx, row in df.iterrows():
    loc = row['primary_location']
    source = "Unknown Source"
    citations = 0
    oa_status = "diamond" # Default fallback
    title = "Unknown Title"
    authors = "Unknown Author"
    link = ""
    
    if not pd.isna(loc) and isinstance(loc, str):
        loc_clean = loc.lower().strip()
        # Find mapped source
        source = source_map.get(loc_clean)
        if not source and "doi.org/" in loc_clean:
            doi_part = loc_clean.split("doi.org/")[-1]
            for k, s in source_map.items():
                if doi_part in k:
                    source = s
                    break
        if not source:
            source = "Unknown Source"
            
        # Find mapped citations
        citations = citations_map.get(loc_clean)
        if citations is None and "doi.org/" in loc_clean:
            doi_part = loc_clean.split("doi.org/")[-1]
            for k, cit in citations_map.items():
                if doi_part in k:
                    citations = cit
                    break
        if citations is None:
            citations = 0
            
        # Find mapped OA status
        oa_status = oa_map.get(loc_clean)
        if not oa_status and "doi.org/" in loc_clean:
            doi_part = loc_clean.split("doi.org/")[-1]
            for k, stat in oa_map.items():
                if doi_part in k:
                    oa_status = stat
                    break
        if not oa_status:
            oa_status = "unknown"
        # NOTA: Não remapear "closed" para "diamond". É incorreto mascarar artigos fechados.
            
        # Find mapped Title
        title = title_map.get(loc_clean)
        if not title and "doi.org/" in loc_clean:
            doi_part = loc_clean.split("doi.org/")[-1]
            for k, t in title_map.items():
                if doi_part in k:
                    title = t
                    break
        if not title:
            title = "Unknown Title"
            
        # Find mapped Authors
        authors = author_map.get(loc_clean)
        if not authors and "doi.org/" in loc_clean:
            doi_part = loc_clean.split("doi.org/")[-1]
            for k, a in author_map.items():
                if doi_part in k:
                    authors = a
                    break
        if not authors:
            authors = "Unknown Author"
            
        # Find mapped Link
        link = link_map.get(loc_clean)
        if not link and "doi.org/" in loc_clean:
            doi_part = loc_clean.split("doi.org/")[-1]
            for k, l in link_map.items():
                if doi_part in k:
                    link = l
                    break
        if not link:
            link = ""
            
    mapped_sources.append(source)
    mapped_citations.append(citations)
    mapped_oa_status.append(oa_status)
    mapped_titles.append(title)
    mapped_authors.append(authors)
    mapped_links.append(link)
    
    # Map topics column to fields list
    topics_val = row['topics']
    fields_list = []
    if not pd.isna(topics_val) and isinstance(topics_val, str):
        parts = [t.strip() for t in topics_val.split(';') if t.strip()]
        for topic in parts:
            field = topic_to_field.get(topic)
            if field:
                fields_list.append(field)
    
    unique_fields = sorted(list(set(fields_list)))
    fields_str = ";".join(unique_fields) if unique_fields else "Other"
    mapped_fields_strings.append(fields_str)

df['mapped_source'] = mapped_sources
df['mapped_citations'] = mapped_citations
df['mapped_fields'] = mapped_fields_strings
df['mapped_oa_status'] = mapped_oa_status
df['mapped_title'] = mapped_titles
df['mapped_authors'] = mapped_authors
df['mapped_link'] = mapped_links

def infer_base_gender(row):
    """Aplica as fontes de classificação em ordem de precisão, sem propagar resultados ainda."""
    gender = "INDEFINIDO"
    loc_val = row.get('primary_location', '')
    if isinstance(loc_val, str) and loc_val.strip():
        loc_clean = loc_val.strip().lower()
        gender = doi_gender_map.get(loc_clean, 'INDEFINIDO')
        if gender == 'INDEFINIDO' and 'doi.org/' in loc_clean:
            gender = doi_gender_map.get(loc_clean.split('doi.org/')[-1], 'INDEFINIDO')

        if gender == 'INDEFINIDO':
            doi_key = loc_clean.split('doi.org/')[-1] if 'doi.org/' in loc_clean else loc_clean
            gender = verified_doi_gender_map.get(doi_key, 'INDEFINIDO')

    if gender == 'INDEFINIDO':
        excel_gender = row.get('genero_previsto')
        if isinstance(excel_gender, str) and excel_gender.strip():
            gender = excel_gender.strip().upper()

    authors_raw = row.get('autores', '')
    first_author_name = authors_raw.split(';')[0].strip() if isinstance(authors_raw, str) else ''
    return rescue_gender_from_name(first_author_name, gender)

# Alguns registros trazem somente iniciais. Quando a mesma assinatura do primeiro
# autor já foi classificada de forma consistente em outra publicação, reutilizamos
# essa evidência. Conflitos são mantidos como INDEFINIDO.
df['base_gender'] = df.apply(infer_base_gender, axis=1)
identity_genders = defaultdict(set)
for _, row in df.iterrows():
    if row['base_gender'] in {'MASCULINO', 'FEMININO'}:
        identity = normalize_author_identity(row.get('autores', ''))
        if identity:
            identity_genders[identity].add(row['base_gender'])

consistent_identity_gender = {
    identity: next(iter(genders))
    for identity, genders in identity_genders.items()
    if len(genders) == 1
}

resolved_genders = []
rescued_by_identity = 0
for _, row in df.iterrows():
    gender = row['base_gender']
    if gender == 'INDEFINIDO':
        identity = normalize_author_identity(row.get('autores', ''))
        inferred_gender = consistent_identity_gender.get(identity)
        if inferred_gender:
            gender = inferred_gender
            rescued_by_identity += 1
    resolved_genders.append(gender)

df['resolved_gender'] = resolved_genders
print(f"  Recovered {rescued_by_identity} undefined genders from consistent author identities.")

print("\nStep 5: Dictionary Encoding individual publications...")
# We build a dictionary-encoded dataset to save file space.
dicts = {
    "languages": [],
    "types": [],
    "genders": [],
    "areas": [],
    "subareas": [],
    "sources": [],
    "institutions": [],
    "countries": [],
    "fields": [],
    "oa_statuses": []
}

def get_dict_id(dct_name, val):
    val = str(val).strip()
    if val not in dicts[dct_name]:
        dicts[dct_name].append(val)
    return dicts[dct_name].index(val)

encoded_data = []

for idx, row in df.iterrows():
    # Year
    year = row['publication_year']
    if pd.isna(year):
        year = 2000
    else:
        year = int(year)
        
    # Language
    lang = row['language']
    if pd.isna(lang) or not isinstance(lang, str):
        lang = "en"
    else:
        lang = lang.strip().lower()
        
    # Document Type
    doc_type = row['type']
    if pd.isna(doc_type) or not isinstance(doc_type, str):
        doc_type = "unknown"  # Não assumir "article" para registros sem tipo
    else:
        doc_type = doc_type.strip().lower()
        
    # Gênero já foi resolvido com a classificação manual, a previsão do Excel,
    # o dicionário de nomes e a consistência da identidade do primeiro autor.
    gender = row['resolved_gender']
        
    # Area
    area = row['area_principal_idx']
    if pd.isna(area) or not isinstance(area, str):
        area = "Other"
    else:
        area = area.strip()
        
    # Subarea (primary_topic)
    subarea = row['primary_topic']
    if pd.isna(subarea) or not isinstance(subarea, str):
        subarea = "Other"
    else:
        subarea = subarea.strip()
        
    # Source
    source = row['mapped_source']
    
    # Institution
    institution = row['assigned_institution']
    
    # Countries
    countries = row['paises']
    if pd.isna(countries) or not isinstance(countries, str):
        countries = "BR"
    else:
        countries = countries.strip().upper()
        
    # Fields string
    fields_str = row['mapped_fields']
    
    # Open Access properties
    # NOTA: A coluna is_oa do Excel tem valores conflitantes para o mesmo artigo
    # (aparece duplicado com True e False). Usamos o oa_status do JSON do OpenAlex
    # como fonte autoritativa para derivar is_oa corretamente.
    oa_status = row['mapped_oa_status']
    # Derivar is_oa a partir do oa_status (fonte confiável dos JSONs)
    OA_OPEN_STATUSES = {'diamond', 'gold', 'green', 'bronze', 'hybrid'}
    is_oa = oa_status.lower() in OA_OPEN_STATUSES if isinstance(oa_status, str) else False

    
    # Citations
    citations = int(row['mapped_citations'])
    
    # Title, Authors, Link
    title = row['mapped_title']
    authors = row['mapped_authors']
    link = row['mapped_link']
    
    row_encoded = [
        year,
        get_dict_id("languages", lang),
        get_dict_id("types", doc_type),
        get_dict_id("genders", gender),
        get_dict_id("areas", area),
        get_dict_id("subareas", subarea),
        get_dict_id("sources", source),
        get_dict_id("institutions", institution),
        get_dict_id("countries", countries),
        get_dict_id("fields", fields_str),
        is_oa,
        get_dict_id("oa_statuses", oa_status),
        citations,
        title,
        authors,
        link
    ]
    encoded_data.append(row_encoded)

print(f"Encoded {len(encoded_data)} publications.")

out_json_path = r"C:\Users\Wadson\Desktop\Novo Projeto Ocean Vega\dashboard_data.json"
out_js_path = r"C:\Users\Wadson\Desktop\Novo Projeto Ocean Vega\dashboard_data.js"
local_json_path = r"c:\Users\Wadson\Documents\Ocean Vega\dashboard_data.json"
local_js_path = r"c:\Users\Wadson\Documents\Ocean Vega\dashboard_data.js"

print("\nStep 6: Saving JSON and JS files...")
output_payload = {
    "dicts": dicts,
    "data": encoded_data
}

# Save to Desktop paths if directory exists
for path_pair in [(out_json_path, out_js_path), (local_json_path, local_js_path)]:
    json_p, js_p = path_pair
    dir_name = os.path.dirname(json_p)
    if os.path.exists(dir_name):
        print(f"Saving to {dir_name}...")
        with open(json_p, 'w', encoding='utf-8') as f:
            json.dump(output_payload, f, ensure_ascii=False, indent=2)
        with open(js_p, 'w', encoding='utf-8') as f:
            f.write("const dashboardDataRaw = ")
            json.dump(output_payload, f, ensure_ascii=False)
            f.write(";")

print("Saved files successfully.")
print(f"Local JS size: {os.path.getsize(local_js_path) / 1024 / 1024:.2f} MB")
