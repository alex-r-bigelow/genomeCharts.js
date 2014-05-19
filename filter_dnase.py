files = ['hmec','hmf','mcf7','mcf7_hypox','nhdf_ad','nhdf_neo','t47d']
headers = ['chrom','start','stop','name','score']

CHROM = 'chr2'
LOW = 201566128
HIGH = 202566128

for f in files:
    infile = open('../dnase_' + f + '.txt','rb')
    outfile = open('dnase_' + f + '.csv','w')
    outfile.write(','.join(headers) + '\n')
    for line in infile:
        temp = line.split()
        if temp[0] == CHROM and float(temp[1]) <= HIGH and float(temp[2]) >= LOW:
            outfile.write(','.join(temp) + '\n')
    infile.close()
    outfile.close()