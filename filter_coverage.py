infile = open('../coverage/average.csv', 'rb')
outfile = open('coverage.csv', 'wb')

bounds = (201566128,202566128)

headers = None

resolution = 800    # total number of data points
linesToAggregate = (bounds[1]-bounds[0]+1)/resolution

counter = 0
total = 0.0

for line in infile:
    if len(line) <= 1:
        continue
    columns = line.split(',')
    if headers == None:
        headers = columns
        outfile.write(line + '\n')
    else:
        total += float(columns[2])
        counter += 1
        if counter > linesToAggregate:
            outfile.write('chr2,%i,%f\n' % (int(columns[1]) - linesToAggregate/2, total / linesToAggregate))
            total = 0.0
            counter = 0
infile.close()
print '%i lines truncated off the end' % counter
outfile.close()