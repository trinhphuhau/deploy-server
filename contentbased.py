import pickle
import sys

# Load mo hinh
books = pickle.load(open('model/books_list.pkl','rb'))
similarity = pickle.load(open('model/similarity.pkl','rb'))

def recommend(book_id):
    # Tim vi tri cua book_id duoc truyen vao trong mo hinh
    index = books[books['book_id'] == book_id].index[0]
    # Sap xep khoang cach giua cac vecto
    distances = sorted(list(enumerate(similarity[index])), reverse=True, key=lambda x: x[1])
    # Lay ra nhung quyen sach co gia tri cao nhat
    recommended = []
    for i in distances[1:6]:
        id = books.iloc[i[0]].book_id
        recommended.append(id)
    return recommended

book_id = int(sys.argv[1]) # Nhan gia tri book_id duoc truyen vao

try:
    print(recommend(book_id)) # Tra ve danh sach book_id da tim duoc
except:
    print(0) # Tra ve 0 neu book_id khong co trong mo hinh

